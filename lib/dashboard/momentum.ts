import { prisma } from '@/lib/db';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export type WeekMetrics = {
  contactsFound: number;
  emailsSent: number;
  pageViews: number;
  replies: number;
};

export type MomentumWeekComparison = {
  thisWeek: WeekMetrics;
  lastWeek: WeekMetrics;
};

/**
 * Returns this week vs last week counts for contacts found, emails sent,
 * page views, and replies. Uses "Contact Added" and "ContactDiscovered" for contacts found.
 */
export async function getMomentumWeekComparison(
  userId: string
): Promise<MomentumWeekComparison> {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const [
    thisWeekActivities,
    lastWeekActivities,
    thisWeekVisits,
    lastWeekVisits,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: {
        userId,
        createdAt: { gte: thisWeekStart },
      },
      select: { type: true },
    }),
    prisma.activity.findMany({
      where: {
        userId,
        createdAt: { gte: lastWeekStart, lt: thisWeekStart },
      },
      select: { type: true },
    }),
    prisma.campaignVisit.count({
      where: {
        campaign: { userId },
        visitedAt: { gte: thisWeekStart },
      },
    }),
    prisma.campaignVisit.count({
      where: {
        campaign: { userId },
        visitedAt: { gte: lastWeekStart, lt: thisWeekStart },
      },
    }),
  ]);

  const countByType = (list: { type: string }[]) => {
    const contactsFound = list.filter((a) =>
      ['Contact Added', 'ContactDiscovered'].includes(a.type)
    ).length;
    const emailsSent = list.filter((a) =>
      ['Email', 'EMAIL_SENT'].includes(a.type)
    ).length;
    const replies = list.filter((a) =>
      ['EmailReply', 'EMAIL_REPLY'].includes(a.type)
    ).length;
    return { contactsFound, emailsSent, replies };
  };

  const thisWeek = {
    ...countByType(thisWeekActivities),
    pageViews: thisWeekVisits,
  };
  const lastWeek = {
    ...countByType(lastWeekActivities),
    pageViews: lastWeekVisits,
  };

  return { thisWeek, lastWeek };
}
