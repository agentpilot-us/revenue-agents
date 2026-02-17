import { prisma } from '@/lib/db';
import { determineTrafficSource } from '@/lib/analytics/utils';
import type { TrafficSource } from '@/lib/types/analytics';

/** Start of day (UTC) for a given date string YYYY-MM-DD */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** End of day (UTC) = start of next day */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isBounce(timeOnPage: number, chatMessages: number, ctaClicked: boolean): boolean {
  return timeOnPage < 10 && chatMessages === 0 && !ctaClicked;
}

/**
 * Aggregate one campaign's visits for a single day into CampaignDailyStats.
 * Use departmentId "" for overall campaign; otherwise use CompanyDepartment id.
 */
export async function aggregateCampaignDay(
  campaignId: string,
  date: Date,
  departmentId: string = ''
): Promise<void> {
  const start = startOfDay(date);
  const end = endOfDay(date);

  const visits = await prisma.campaignVisit.findMany({
    where: {
      campaignId,
      visitedAt: { gte: start, lt: end },
      ...(departmentId ? { departmentId } : {}),
    },
    select: {
      id: true,
      sessionId: true,
      timeOnPage: true,
      scrollDepth: true,
      chatMessages: true,
      ctaClicked: true,
      formSubmitted: true,
      utmSource: true,
      utmMedium: true,
      referrer: true,
    },
  });

  if (visits.length === 0) {
    await prisma.campaignDailyStats.upsert({
      where: {
        campaignId_date_departmentId: { campaignId, date: start, departmentId },
      },
      create: {
        campaignId,
        date: start,
        departmentId,
        totalVisits: 0,
        uniqueVisitors: 0,
        returningVisitors: 0,
        avgTimeOnPage: 0,
        avgScrollDepth: 0,
        bounceRate: 0,
        chatSessions: 0,
        chatMessages: 0,
        ctaClicks: 0,
        formSubmissions: 0,
        directTraffic: 0,
        emailTraffic: 0,
        linkedinTraffic: 0,
        organicTraffic: 0,
        paidTraffic: 0,
      },
      update: {},
    });
    return;
  }

  const uniqueSessions = new Set(visits.map((v) => v.sessionId).filter(Boolean));
  const totalVisits = visits.length;
  const uniqueVisitors = uniqueSessions.size;
  const returningVisitors = Math.max(0, totalVisits - uniqueVisitors);

  const totalTime = visits.reduce((s, v) => s + (v.timeOnPage ?? 0), 0);
  const totalScroll = visits.reduce((s, v) => s + (v.scrollDepth ?? 0), 0);
  const bounceCount = visits.filter((v) =>
    isBounce(v.timeOnPage ?? 0, v.chatMessages ?? 0, v.ctaClicked ?? false)
  ).length;
  const chatSessions = visits.filter((v) => (v.chatMessages ?? 0) > 0).length;
  const chatMessages = visits.reduce((s, v) => s + (v.chatMessages ?? 0), 0);
  const ctaClicks = visits.filter((v) => v.ctaClicked).length;
  const formSubmissions = visits.filter((v) => v.formSubmitted).length;

  const trafficCounts: Record<TrafficSource, number> = {
    direct: 0,
    email: 0,
    linkedin: 0,
    organic: 0,
    paid: 0,
    referral: 0,
  };
  for (const v of visits) {
    const source = determineTrafficSource(v.utmSource, v.utmMedium, v.referrer);
    trafficCounts[source]++;
  }

  const bounceRate = totalVisits > 0 ? Math.round((bounceCount / totalVisits) * 100) : 0;
  const avgTimeOnPage = totalVisits > 0 ? Math.round(totalTime / totalVisits) : 0;
  const avgScrollDepth = totalVisits > 0 ? Math.round(totalScroll / totalVisits) : 0;

  await prisma.campaignDailyStats.upsert({
    where: {
      campaignId_date_departmentId: { campaignId, date: start, departmentId },
    },
    create: {
      campaignId,
      date: start,
      departmentId,
      totalVisits,
      uniqueVisitors,
      returningVisitors,
      avgTimeOnPage,
      avgScrollDepth,
      bounceRate,
      chatSessions,
      chatMessages,
      ctaClicks,
      formSubmissions,
      directTraffic: trafficCounts.direct,
      emailTraffic: trafficCounts.email,
      linkedinTraffic: trafficCounts.linkedin,
      organicTraffic: trafficCounts.organic,
      paidTraffic: trafficCounts.paid,
    },
    update: {
      totalVisits,
      uniqueVisitors,
      returningVisitors,
      avgTimeOnPage,
      avgScrollDepth,
      bounceRate,
      chatSessions,
      chatMessages,
      ctaClicks,
      formSubmissions,
      directTraffic: trafficCounts.direct,
      emailTraffic: trafficCounts.email,
      linkedinTraffic: trafficCounts.linkedin,
      organicTraffic: trafficCounts.organic,
      paidTraffic: trafficCounts.paid,
    },
  });
}

/**
 * Aggregate all campaigns for a given date (overall stats only, departmentId "").
 */
export async function aggregateAllCampaignsForDate(date: Date): Promise<{ campaignId: string }[]> {
  const campaigns = await prisma.segmentCampaign.findMany({
    select: { id: true },
  });
  const done: { campaignId: string }[] = [];
  for (const c of campaigns) {
    await aggregateCampaignDay(c.id, date, '');
    done.push({ campaignId: c.id });
  }
  return done;
}

/**
 * Aggregate yesterday for all campaigns. Used by cron.
 */
export async function aggregateYesterday(): Promise<{ campaignId: string }[]> {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  return aggregateAllCampaignsForDate(yesterday);
}

/**
 * Backfill aggregation for a date range (inclusive). Useful for initial rollout.
 */
export async function backfillAggregation(fromDate: Date, toDate: Date): Promise<number> {
  let count = 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(0, 0, 0, 0);
  const campaigns = await prisma.segmentCampaign.findMany({ select: { id: true } });
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    for (const c of campaigns) {
      await aggregateCampaignDay(c.id, new Date(d), '');
      count++;
    }
  }
  return count;
}
