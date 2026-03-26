/**
 * Cron: fetch account signals via web search for all user companies.
 * GET (Vercel Cron) and POST supported; auth via CRON_SECRET (Bearer or ?secret=).
 * Processes companies in batches of 5 with 1s delay to respect rate limits.
 * Dedup by (companyId, url); type-based skip for earnings_call/acquisition within 7 days.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchAccountSignals, classifyPreFetchedSignals, type CustomExaQuery } from '@/lib/signals/fetch-account-signals';
import { TYPE_DEDUP_DAYS } from '@/lib/signals/constants';
import { generateRenewalSignals } from '@/lib/signals/renewal-signals';
import { fetchWebsetResults } from '@/lib/exa/websets';
import { matchSignalToPlayMapping } from '@/lib/plays/match-signal-to-play-mapping';

const BATCH_SIZE = 5;
const DELAY_MS = 1000;

function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === secret;
  }
  const url = new URL(req.url);
  return url.searchParams.get('secret') === secret;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const maxDuration = 300;

/** Vercel Cron invokes GET; POST kept for manual / external triggers. */
async function runFetchAccountSignalsCron(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { isDemoAccount: false },
    select: { id: true, name: true, domain: true, industry: true, userId: true, lastSignalHash: true, exaWebsetId: true },
  });

  let processed = 0;
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (company) => {
        const uid = company.userId;
        if (!uid) return;
        processed++;
        try {
          // Pass the previous hash so we can skip the LLM call when search results haven't changed
          const existingSignals = company.lastSignalHash
            ? await prisma.accountSignal.findMany({
                where: { companyId: company.id, userId: uid },
                orderBy: { publishedAt: 'desc' },
                take: 20,
              })
            : [];

          const prevSignalsMapped = existingSignals.map((s) => ({
            type: s.type as import('@/lib/signals/fetch-account-signals').SignalType,
            title: s.title,
            summary: s.summary,
            url: s.url,
            publishedAt: s.publishedAt.toISOString(),
            relevanceScore: s.relevanceScore,
            suggestedPlay: (s.suggestedPlay as import('@/lib/signals/fetch-account-signals').SuggestedPlay) ?? undefined,
          }));

          const customConfigs = await prisma.customSignalConfig.findMany({
            where: {
              userId: uid,
              type: 'exa_search',
              isActive: true,
              OR: [{ companyId: company.id }, { companyId: null }],
            },
          });
          type ExaSearchConfig = { query: string; numResults?: number };
          const seenQueryKeys = new Set<string>();
          const customQueries: CustomExaQuery[] = customConfigs
            .filter((c: { config: unknown }) => {
              const cfg = c.config as ExaSearchConfig;
              if (!cfg?.query) return false;
              const key = cfg.query.trim().toLowerCase();
              if (seenQueryKeys.has(key)) return false;
              seenQueryKeys.add(key);
              return true;
            })
            .map((c: { name: string; config: unknown }) => ({
              configName: c.name,
              query: (c.config as ExaSearchConfig).query,
              numResults: (c.config as ExaSearchConfig).numResults,
            }));

          let result: import('@/lib/signals/fetch-account-signals').FetchSignalsResult;

          if (company.exaWebsetId) {
            const websetItems = await fetchWebsetResults(company.exaWebsetId);

            if (customQueries.length > 0) {
              const adHocResult = await fetchAccountSignals(
                company.name,
                company.domain ?? '',
                company.industry,
                48,
                undefined,
                undefined,
                customQueries,
              );
              const allItems = [
                ...websetItems,
                ...adHocResult.signals.map((s) => ({
                  url: s.url,
                  title: s.title,
                  text: s.summary,
                  publishedDate: s.publishedAt,
                })),
              ];
              const seenUrls = new Set<string>();
              const deduped = allItems.filter((item) => {
                if (seenUrls.has(item.url)) return false;
                seenUrls.add(item.url);
                return true;
              });
              result = await classifyPreFetchedSignals(
                company.name,
                company.domain ?? '',
                company.industry,
                deduped,
                company.lastSignalHash,
                prevSignalsMapped,
              );
            } else {
              result = await classifyPreFetchedSignals(
                company.name,
                company.domain ?? '',
                company.industry,
                websetItems,
                company.lastSignalHash,
                prevSignalsMapped,
              );
            }
          } else {
            result = await fetchAccountSignals(
              company.name,
              company.domain ?? '',
              company.industry,
              48,
              company.lastSignalHash,
              prevSignalsMapped,
              customQueries.length > 0 ? customQueries : undefined
            );
          }

          if (result.urlHash && result.urlHash !== company.lastSignalHash) {
            await prisma.company.update({
              where: { id: company.id },
              data: { lastSignalHash: result.urlHash },
            });
          }

          if (result.skippedLlm) {
            skipped++;
            return;
          }

          for (const signal of result.signals) {
            const existingByUrl = await prisma.accountSignal.findFirst({
              where: { companyId: company.id, url: signal.url },
            });
            if (existingByUrl) continue;

            const dedupDays = TYPE_DEDUP_DAYS[signal.type];
            if (dedupDays != null) {
              const since = new Date();
              since.setDate(since.getDate() - dedupDays);
              const existingByType = await prisma.accountSignal.findFirst({
                where: {
                  companyId: company.id,
                  type: signal.type,
                  publishedAt: { gte: since },
                },
              });
              if (existingByType) continue;
            }

            const publishedAt = new Date(signal.publishedAt);
            if (isNaN(publishedAt.getTime())) {
              publishedAt.setTime(Date.now());
            }

            const newSignal = await prisma.accountSignal.create({
              data: {
                companyId: company.id,
                userId: uid,
                type: signal.type,
                title: signal.customSignalName
                  ? `[${signal.customSignalName}] ${signal.title}`
                  : signal.title,
                summary: signal.summary,
                url: signal.url,
                publishedAt,
                relevanceScore: signal.relevanceScore,
                suggestedPlay: signal.suggestedPlay ?? null,
                status: 'new',
              },
            });
            created++;

            try {
              await matchSignalToPlayMapping({
                id: newSignal.id,
                companyId: company.id,
                userId: uid,
                type: newSignal.type,
                title: newSignal.title,
                summary: newSignal.summary,
                relevanceScore: newSignal.relevanceScore,
                suggestedPlay: newSignal.suggestedPlay,
              });
            } catch (matchErr) {
              console.error(`Signal matching failed for ${newSignal.id}:`, matchErr);
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${company.name}: ${msg}`);
        }
      })
    );
    if (i + BATCH_SIZE < companies.length) {
      await sleep(DELAY_MS);
    }
  }

  // Generate renewal-approaching signals for all users
  let renewalCreated = 0;
  try {
    const users = await prisma.user.findMany({
      where: { accountStatus: 'active' },
      select: { id: true },
    });
    for (const user of users) {
      renewalCreated += await generateRenewalSignals(user.id);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`renewal-signals: ${msg}`);
  }

  return NextResponse.json({
    ok: true,
    processed,
    created,
    renewalCreated,
    skippedLlm: skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function GET(req: NextRequest) {
  return runFetchAccountSignalsCron(req);
}

export async function POST(req: NextRequest) {
  return runFetchAccountSignalsCron(req);
}
