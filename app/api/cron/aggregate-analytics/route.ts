/**
 * GET /api/cron/aggregate-analytics
 * Daily cron: aggregate campaign analytics for yesterday.
 * Secure with CRON_SECRET (Bearer in Authorization or query secret).
 */
import { NextRequest, NextResponse } from 'next/server';
import { aggregateYesterday } from '@/lib/analytics/daily-aggregation';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7) === secret;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await aggregateYesterday();
    return NextResponse.json({ ok: true, campaignsProcessed: result.length });
  } catch (e) {
    console.error('Cron aggregate-analytics error:', e);
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 500 });
  }
}
