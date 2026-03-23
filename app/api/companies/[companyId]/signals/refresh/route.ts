import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { fetchAccountSignals, classifyPreFetchedSignals, type CustomExaQuery } from '@/lib/signals/fetch-account-signals';
import { TYPE_DEDUP_DAYS } from '@/lib/signals/constants';
import { fetchWebsetResults } from '@/lib/exa/websets';
import { matchSignalToPlayMapping } from '@/lib/plays/match-signal-to-play-mapping';

export const maxDuration = 120;

type ExaSearchConfig = { query: string; numResults?: number };

function resolveCustomQueries(
  configs: Array<{ name: string; config: unknown }>,
): CustomExaQuery[] {
  const seen = new Set<string>();
  return configs
    .map((c) => {
      const cfg = c.config as ExaSearchConfig | null;
      if (!cfg || typeof cfg.query !== 'string') return null;
      const key = cfg.query.trim().toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        configName: c.name,
        query: cfg.query,
        numResults: typeof cfg.numResults === 'number' ? cfg.numResults : 5,
      };
    })
    .filter(Boolean) as CustomExaQuery[];
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const userId = session.user.id;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId },
      select: {
        id: true,
        name: true,
        domain: true,
        industry: true,
        lastSignalHash: true,
        exaWebsetId: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const customConfigs = await prisma.customSignalConfig.findMany({
      where: {
        userId,
        type: 'exa_search',
        isActive: true,
        OR: [{ companyId: company.id }, { companyId: null }],
      },
      select: { name: true, config: true },
    });
    const customQueries = resolveCustomQueries(customConfigs);

    const existingSignals = company.lastSignalHash
      ? await prisma.accountSignal.findMany({
          where: { companyId: company.id, userId },
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
        customQueries.length > 0 ? customQueries : undefined,
      );
    }

    if (result.urlHash && result.urlHash !== company.lastSignalHash) {
      await prisma.company.update({
        where: { id: company.id },
        data: { lastSignalHash: result.urlHash },
      });
    }

    let created = 0;

    if (!result.skippedLlm) {
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
            userId,
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
            userId,
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
    }

    return NextResponse.json({
      ok: true,
      companyId: company.id,
      created,
      skippedLlm: result.skippedLlm,
    });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/signals/refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh signals' },
      { status: 500 },
    );
  }
}
