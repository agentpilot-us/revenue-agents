/**
 * Weekly: refresh stale account intelligence (Company researchData + top-level fields) via researchCompanyForAccount.
 * Batched and capped for cost; does not recreate departments (use apply-research in UI for full segment sync).
 */
import { NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { researchCompanyForAccount } from '@/lib/research/research-company';
import { persistCompanyResearchSnapshot } from '@/lib/research/persist-company-research-snapshot';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7) === secret;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const staleDaysRaw = process.env.ACCOUNT_RESEARCH_STALE_DAYS?.trim();
  const staleDays = staleDaysRaw ? Math.max(1, parseInt(staleDaysRaw, 10) || 14) : 14;
  const cutoff = subDays(new Date(), staleDays);

  const capRaw = process.env.ACCOUNT_RESEARCH_BATCH_CAP?.trim();
  const batchCap = capRaw ? Math.max(1, Math.min(20, parseInt(capRaw, 10) || 4)) : 4;

  const companies = await prisma.company.findMany({
    where: {
      isDemoAccount: false,
      OR: [{ accountResearchRefreshedAt: null }, { accountResearchRefreshedAt: { lt: cutoff } }],
    },
    select: {
      id: true,
      name: true,
      domain: true,
      userId: true,
    },
    orderBy: { accountResearchRefreshedAt: 'asc' },
    take: batchCap,
  });

  const results: { companyId: string; ok: boolean; error?: string }[] = [];

  for (const c of companies) {
    try {
      const res = await researchCompanyForAccount(c.name, c.domain ?? undefined, c.userId);
      if (!res.ok) {
        results.push({ companyId: c.id, ok: false, error: res.error ?? 'Research failed' });
        continue;
      }
      await persistCompanyResearchSnapshot(
        c.id,
        res.data,
        JSON.parse(JSON.stringify(res.data)) as import('@prisma/client').Prisma.InputJsonValue,
      );
      results.push({ companyId: c.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ companyId: c.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    staleDays,
    batchCap,
    processed: results.length,
    results,
  });
}
