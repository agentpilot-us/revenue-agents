/**
 * Daily: mark ACTIVE PlayRuns with no row updates for N days as AT_RISK (Needs Attention).
 */
import { NextRequest, NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/db';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7) === secret;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const daysRaw = process.env.PLAY_RUN_STALE_DAYS?.trim();
  const staleDays = daysRaw ? Math.max(1, parseInt(daysRaw, 10) || 14) : 14;
  const cutoff = subDays(new Date(), staleDays);

  const candidates = await prisma.playRun.findMany({
    where: {
      status: 'ACTIVE',
      updatedAt: { lt: cutoff },
      company: { isDemoAccount: false },
    },
    select: { id: true, triggerContext: true },
    take: 500,
  });

  let flagged = 0;
  const staleSince = new Date().toISOString();

  for (const row of candidates) {
    const prev =
      row.triggerContext != null && typeof row.triggerContext === 'object' && !Array.isArray(row.triggerContext)
        ? { ...(row.triggerContext as Record<string, unknown>) }
        : {};
    prev.staleSince = staleSince;

    await prisma.playRun.update({
      where: { id: row.id },
      data: {
        status: 'AT_RISK',
        triggerContext: prev as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
    flagged++;
  }

  return NextResponse.json({
    ok: true,
    staleDays,
    cutoff: cutoff.toISOString(),
    flagged,
    scanned: candidates.length,
  });
}
