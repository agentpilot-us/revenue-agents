/**
 * Weekly: delete ContactTouch rows older than retention window (default 90 days).
 * Cooldown queries only use recent touches; this keeps the table bounded.
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

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const daysRaw = process.env.CONTACT_TOUCH_RETENTION_DAYS?.trim();
  const days = daysRaw ? Math.max(1, parseInt(daysRaw, 10) || 90) : 90;
  const cutoff = subDays(new Date(), days);

  const result = await prisma.contactTouch.deleteMany({
    where: { touchDate: { lt: cutoff } },
  });

  return NextResponse.json({
    ok: true,
    deleted: result.count,
    retentionDays: days,
    cutoff: cutoff.toISOString(),
  });
}
