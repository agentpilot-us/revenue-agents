import { ContentType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getPlayDisplayName } from '@/lib/plays/plays-config';
import { RELEVANCE_HOT_SIGNALS_MIN, RELEVANCE_TIER_1_MIN, RELEVANCE_TIER_2_MIN } from '@/lib/signals/constants';

const execPattern =
  /CFO|CIO|CTO|CISO|CEO|VP|Vice President|Head|President|Director/i;

export type HotSignal = {
  companyId: string;
  companyName: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  color: 'red' | 'amber' | 'green';
  date: string;
  contactId?: string;
  departmentId?: string;
  campaignId?: string;
  /** When set, this signal is from AccountSignal and can be dismissed via PATCH /api/signals/[id]/dismiss */
  signalId?: string;
  /** When set, CTA is POST to run-play (use RunPlayButton), not navigation */
  runPlaySignalId?: string;
};

function classifyTier1(
  visit: {
    visitorJobTitle?: string | null;
    ctaClicked?: boolean;
    formSubmitted?: boolean;
  },
  visitCount: number
): boolean {
  if (
    visit.visitorJobTitle &&
    execPattern.test(visit.visitorJobTitle) &&
    visit.ctaClicked
  )
    return true;
  if (visit.formSubmitted) return true;
  if (visitCount >= 3) return true;
  return false;
}

/**
 * Returns hot signals (last 48h) across all user companies for the dashboard.
 * Tier 1 -> red, Tier 2 -> amber, Tier 3 -> green.
 */
export async function getHotSignals(userId: string): Promise<HotSignal[]> {
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

  const companies = await prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const companyIds = companies.map((c) => c.id);
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const signals: HotSignal[] = [];

  if (companyIds.length === 0) return signals;

  // Campaign visits in last 48h (campaigns belong to user's companies)
  const visits = await prisma.campaignVisit.findMany({
    where: {
      campaign: { companyId: { in: companyIds } },
      visitedAt: { gte: fortyEightHoursAgo },
    },
    select: {
      id: true,
      visitorJobTitle: true,
      visitorEmail: true,
      visitorCompany: true,
      ctaClicked: true,
      formSubmitted: true,
      visitedAt: true,
      departmentId: true,
      campaignId: true,
      campaign: { select: { companyId: true } },
    },
    orderBy: { visitedAt: 'desc' },
  });

  const visitsByCompany: Record<string, number> = {};
  visits.forEach((v) => {
    const key = v.visitorCompany ?? 'unknown';
    visitsByCompany[key] = (visitsByCompany[key] ?? 0) + 1;
  });

  for (const visit of visits) {
    const companyId = visit.campaign.companyId;
    const companyName = companyById.get(companyId) ?? 'Account';
    const visitCount = visit.visitorCompany
      ? visitsByCompany[visit.visitorCompany] ?? 0
      : 0;

    if (classifyTier1(visit, visitCount)) {
      let headline = '';
      let description = '';
      if (visit.formSubmitted) {
        headline = 'Form submitted on landing page';
        description = visit.visitorEmail
          ? `Contact ${visit.visitorEmail} submitted a form`
          : 'A visitor submitted a form';
      } else if (
        visit.ctaClicked &&
        visit.visitorJobTitle &&
        execPattern.test(visit.visitorJobTitle)
      ) {
        headline = `${visit.visitorJobTitle} viewed page and clicked CTA`;
        description = visit.visitorEmail
          ? `High-value engagement from ${visit.visitorEmail}`
          : 'Executive-level engagement detected';
      } else if (visitCount >= 3) {
        headline = `Multiple visits from ${visit.visitorCompany}`;
        description = `${visitCount} visits detected from this organization`;
      }
      if (headline) {
        signals.push({
          companyId,
          companyName,
          headline,
          description,
          ctaLabel: 'Draft follow-up email',
          ctaHref: `/dashboard/companies/${companyId}${visit.departmentId ? `/departments/${visit.departmentId}` : ''}`,
          color: 'red',
          date: visit.visitedAt.toISOString(),
          departmentId: visit.departmentId ?? undefined,
          campaignId: visit.campaignId,
        });
      }
    } else {
      // Tier 3: page view
      signals.push({
        companyId,
        companyName,
        headline: visit.visitorCompany
          ? `${visit.visitorCompany} visited page`
          : 'Page view',
        description: visit.visitorEmail
          ? `Visit from ${visit.visitorEmail}`
          : 'Anonymous page view',
        ctaLabel: 'View details',
        ctaHref: `/dashboard/companies/${companyId}`,
        color: 'green',
        date: visit.visitedAt.toISOString(),
        departmentId: visit.departmentId ?? undefined,
        campaignId: visit.campaignId,
      });
    }
  }

  // Email replies (Tier 1) in last 48h
  const activities = await prisma.activity.findMany({
    where: {
      companyId: { in: companyIds },
      userId,
      createdAt: { gte: fortyEightHoursAgo },
      type: { in: ['EmailReply', 'EMAIL_REPLY'] },
    },
    select: {
      id: true,
      summary: true,
      createdAt: true,
      contactId: true,
      companyId: true,
      companyDepartmentId: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const activity of activities) {
    const companyName = companyById.get(activity.companyId) ?? 'Account';
    const isExec =
      activity.contact?.title && execPattern.test(activity.contact.title);
    const contactName =
      [activity.contact?.firstName, activity.contact?.lastName]
        .filter(Boolean)
        .join(' ') ||
      activity.contact?.email ||
      'Contact';
    signals.push({
      companyId: activity.companyId,
      companyName,
      headline: `${activity.contact?.title ?? 'Contact'} replied to email`,
      description: `${contactName} responded to your outreach`,
      ctaLabel: 'View contact',
      ctaHref: `/dashboard/companies/${activity.companyId}${activity.contactId ? `?contactId=${activity.contactId}` : ''}`,
      color: isExec ? 'red' : 'green',
      date: activity.createdAt.toISOString(),
      contactId: activity.contactId ?? undefined,
      departmentId: activity.companyDepartmentId ?? undefined,
    });
  }

  // Account signals from Exa (realtime news, earnings, executive) — status new, score >= 7, last 48h
  const accountSignals = await prisma.accountSignal.findMany({
    where: {
      userId,
      status: 'new',
      relevanceScore: { gte: RELEVANCE_HOT_SIGNALS_MIN },
      publishedAt: { gte: fortyEightHoursAgo },
    },
    include: { company: { select: { name: true } } },
    orderBy: [{ relevanceScore: 'desc' }, { publishedAt: 'desc' }],
    take: 10,
  });
  for (const s of accountSignals) {
    const color: 'red' | 'amber' | 'green' =
      s.relevanceScore >= RELEVANCE_TIER_1_MIN
        ? 'red'
        : s.relevanceScore >= RELEVANCE_TIER_2_MIN
          ? 'amber'
          : 'green';
    const playLabel = getPlayDisplayName(s.suggestedPlay ?? undefined);
    signals.push({
      companyId: s.companyId,
      companyName: s.company.name,
      headline: s.title,
      description: s.summary,
      ctaLabel: playLabel ? `Run ${playLabel} play` : 'View account',
      ctaHref: playLabel
        ? `/api/signals/${s.id}/run-play`
        : `/dashboard/companies/${s.companyId}`,
      color,
      date: s.publishedAt.toISOString(),
      signalId: s.id,
      runPlaySignalId: playLabel ? s.id : undefined,
    });
  }

  // New feature release ready (green) - user-level content
  const featureRelease = await prisma.contentLibrary.findFirst({
    where: {
      userId,
      type: ContentType.FeatureRelease,
      isActive: true,
      archivedAt: null,
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  if (featureRelease) {
    const dateLabel = featureRelease.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    signals.push({
      companyId: '',
      companyName: '',
      headline: 'New feature release ready to share',
      description: `"${featureRelease.title}" — ${dateLabel}`,
      ctaLabel: 'Run Feature Release play',
      ctaHref: '/chat?play=expansion',
      color: 'green',
      date: featureRelease.createdAt.toISOString(),
    });
  }

  // Sort by date descending
  signals.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return signals.slice(0, 10);
}
