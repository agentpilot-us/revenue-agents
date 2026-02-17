/**
 * POST /api/analytics/aggregate – run daily aggregation (yesterday / date / backfill).
 * GET /api/analytics/aggregate – status (requires CRON_SECRET or internal).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  aggregateYesterday,
  aggregateAllCampaignsForDate,
  backfillAggregation,
} from '@/lib/analytics/daily-aggregation';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7) === secret;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = (body.mode as string) || 'yesterday';

    if (mode === 'yesterday') {
      const result = await aggregateYesterday();
      return NextResponse.json({ ok: true, mode: 'yesterday', campaigns: result.length, campaignsProcessed: result });
    }

    if (mode === 'date' && body.date) {
      const date = new Date(body.date as string);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      const result = await aggregateAllCampaignsForDate(date);
      return NextResponse.json({ ok: true, mode: 'date', date: body.date, campaignsProcessed: result.length });
    }

    if (mode === 'backfill' && body.from && body.to) {
      const from = new Date(body.from as string);
      const to = new Date(body.to as string);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
      }
      const count = await backfillAggregation(from, to);
      return NextResponse.json({ ok: true, mode: 'backfill', statsUpserted: count });
    }

    return NextResponse.json(
      { error: 'Invalid mode. Use mode: "yesterday" | "date" (with date) | "backfill" (with from, to)' },
      { status: 400 }
    );
  } catch (e) {
    console.error('Analytics aggregate error:', e);
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [campaignCount, statsCount, latestStat] = await Promise.all([
      prisma.segmentCampaign.count(),
      prisma.campaignDailyStats.count(),
      prisma.campaignDailyStats.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true, campaignId: true },
      }),
    ]);
    return NextResponse.json({
      campaigns: campaignCount,
      dailyStatsRows: statsCount,
      latestStatDate: latestStat?.date?.toISOString().slice(0, 10) ?? null,
    });
  } catch (e) {
    console.error('Analytics aggregate status error:', e);
    return NextResponse.json({ error: 'Status failed' }, { status: 500 });
  }
}
