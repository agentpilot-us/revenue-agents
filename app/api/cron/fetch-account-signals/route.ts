/**
 * Cron: fetch account signals via Exa for all user companies.
 * Processes companies in batches of 5 with 1s delay to respect Exa rate limits.
 * Dedup by (companyId, url); type-based skip for earnings_call/acquisition within 7 days.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchAccountSignals } from '@/lib/signals/fetch-account-signals';
import { TYPE_DEDUP_DAYS } from '@/lib/signals/constants';

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

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, domain: true, industry: true, userId: true },
  });

  let processed = 0;
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (company) => {
        const uid = company.userId;
        if (!uid) return;
        processed++;
        try {
          const signals = await fetchAccountSignals(
            company.name,
            company.domain ?? '',
            company.industry,
            48
          );

          for (const signal of signals) {
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

            await prisma.accountSignal.create({
              data: {
                companyId: company.id,
                userId: uid,
                type: signal.type,
                title: signal.title,
                summary: signal.summary,
                url: signal.url,
                publishedAt,
                relevanceScore: signal.relevanceScore,
                suggestedPlay: signal.suggestedPlay ?? null,
                status: 'new',
              },
            });
            created++;
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

  return NextResponse.json({
    ok: true,
    processed,
    created,
    errors: errors.length > 0 ? errors : undefined,
  });
}
