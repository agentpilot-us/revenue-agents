import { ContentType } from '@prisma/client';
import { prisma } from '@/lib/db';
/** Format a suggestedPlay string into a human-readable label */
function formatPlayLabel(suggestedPlay: string | null | undefined): string | null {
  if (!suggestedPlay) return null;
  return suggestedPlay
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
import { RELEVANCE_HOT_SIGNALS_MIN, RELEVANCE_TIER_1_MIN, RELEVANCE_TIER_2_MIN } from '@/lib/signals/constants';
import { buildNextBestActionHref } from '@/lib/dashboard/signal-play-href';
import { resolveDivisionForSignal } from '@/lib/signals/division-resolution';
import { buildContentUrl } from '@/lib/urls/content';

const execPattern =
  /CFO|CIO|CTO|CISO|CEO|VP|Vice President|Head|President|Director/i;

/** Build company page URL with 6-tab set and optional context (Spec 1). */
function companyTabUrl(
  companyId: string,
  opts: {
    tab: 'overview' | 'buying-groups' | 'contacts' | 'content' | 'engagement' | 'signals';
    division?: string | null;
    type?: string;
    signal?: string;
    contact?: string;
    action?: string;
    contactName?: string;
    contentFilter?: string;
  }
): string {
  const params = new URLSearchParams();
  params.set('tab', opts.tab);
  if (opts.division) params.set('division', opts.division);
  if (opts.type) params.set('type', opts.type);
  if (opts.signal) params.set('signal', opts.signal);
  if (opts.contact) params.set('contact', opts.contact);
  if (opts.action) params.set('action', opts.action);
  if (opts.contactName) params.set('contactName', opts.contactName);
  if (opts.contentFilter) params.set('contentFilter', opts.contentFilter);
  return `/dashboard/companies/${companyId}?${params.toString()}`;
}

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
  /** Division name when roadmap is enterprise_expansion (no more "Run X play") */
  divisionName?: string;
  /** Secondary CTA e.g. View in Division */
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
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
 * When roadmap is enterprise_expansion, adds divisionName and Roadmap-aware CTAs (no "Run X play").
 */
export async function getHotSignals(
  userId: string,
  options?: { roadmap?: { roadmapType: string } | null }
): Promise<HotSignal[]> {
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

  const companies = await prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const companyIds = companies.map((c) => c.id);
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const signals: HotSignal[] = [];
  const isRoadmapDriven = options?.roadmap?.roadmapType === 'enterprise_expansion';

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
      department: { select: { customName: true } },
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

    const visitResolved =
      isRoadmapDriven
        ? await resolveDivisionForSignal({
            userId,
            companyId,
            contactEmail: visit.visitorEmail ?? null,
            companyDepartmentId: visit.departmentId ?? null,
          })
        : { division: null as { id: string; name: string } | null };
    const divisionName = visitResolved.division?.name ?? null;
    const divId = visitResolved.division?.id ?? visit.departmentId ?? undefined;
    const viewInDivisionHref = companyTabUrl(companyId, {
      tab: 'overview',
      division: divId ?? undefined,
    });

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
          ctaHref: companyTabUrl(companyId, {
            tab: 'content',
            division: divId,
            type: 'email',
          }),
          color: 'red',
          date: visit.visitedAt.toISOString(),
          departmentId: visit.departmentId ?? undefined,
          campaignId: visit.campaignId,
          divisionName: divisionName ?? undefined,
          secondaryCtaLabel: divisionName ? 'View in Division' : undefined,
          secondaryCtaHref: divisionName ? viewInDivisionHref : undefined,
        });
      }
    } else {
      const hasKnownVisitor = Boolean(visit.visitorEmail);
      const playId = hasKnownVisitor && !isRoadmapDriven ? 're_engagement' : undefined;
      signals.push({
        companyId,
        companyName,
        headline: visit.visitorCompany
          ? `${visit.visitorCompany} visited page`
          : 'Page view',
        description: visit.visitorEmail
          ? `Visit from ${visit.visitorEmail}`
          : 'Anonymous page view',
        ctaLabel:
          isRoadmapDriven
            ? (hasKnownVisitor ? 'Draft Follow-Up' : 'View details')
            : (playId ? 'View Plan' : 'View details'),
        ctaHref:
          isRoadmapDriven
            ? (hasKnownVisitor
                ? companyTabUrl(companyId, { tab: 'content', division: divId, type: 'email' })
                : companyTabUrl(companyId, { tab: 'overview' }))
            : playId
              ? buildNextBestActionHref({
                  companyId,
                  playId,
                  segmentId: visit.departmentId ?? undefined,
                  segmentName: visit.department?.customName ?? undefined,
                  triggerText: visit.visitorEmail ? `Page view from ${visit.visitorEmail}` : undefined,
                })
              : companyTabUrl(companyId, { tab: 'overview' }),
        color: 'green',
        date: visit.visitedAt.toISOString(),
        departmentId: visit.departmentId ?? undefined,
        campaignId: visit.campaignId,
        divisionName: divisionName ?? undefined,
        secondaryCtaLabel: divisionName ? 'View in Division' : undefined,
        secondaryCtaHref: divisionName ? viewInDivisionHref : undefined,
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
      ctaHref: companyTabUrl(activity.companyId, {
        tab: 'contacts',
        division: activity.companyDepartmentId ?? undefined,
      }),
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
    const playLabel = formatPlayLabel(s.suggestedPlay);
    const useRoadmapCta = isRoadmapDriven;
    const resolved =
      useRoadmapCta
        ? await resolveDivisionForSignal({
            userId,
            companyId: s.companyId,
            signalTitle: s.title,
            signalSummary: s.summary,
          })
        : { division: null as { id: string; name: string } | null };
    const divisionId = resolved.division?.id;
    const divisionName = resolved.division?.name;
    const hasPlanLikeCta = useRoadmapCta || !!playLabel;
    signals.push({
      companyId: s.companyId,
      companyName: s.company.name,
      headline: s.title,
      description: s.summary,
      ctaLabel: hasPlanLikeCta ? 'View Plan' : 'View account',
      ctaHref: hasPlanLikeCta
        ? buildContentUrl({
            companyId: s.companyId,
            triggerId: s.id,
            divisionId: divisionId ?? undefined,
            channel: 'email',
          })
        : companyTabUrl(s.companyId, { tab: 'overview' }),
      color,
      date: s.publishedAt.toISOString(),
      signalId: s.id,
      departmentId: divisionId,
      divisionName,
      secondaryCtaLabel: divisionName ? 'View in Division' : undefined,
      secondaryCtaHref: divisionName
        ? companyTabUrl(s.companyId, { tab: 'overview', division: divisionId ?? undefined })
        : undefined,
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
  if (featureRelease && !isRoadmapDriven) {
    const dateLabel = featureRelease.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    const firstCompanyId = companyIds[0];
    signals.push({
      companyId: '',
      companyName: '',
      headline: 'New feature release ready to share',
      description: `"${featureRelease.title}" — ${dateLabel}`,
      ctaLabel: 'View Plan',
      ctaHref:
        firstCompanyId
          ? buildNextBestActionHref({
              companyId: firstCompanyId,
              playId: 'feature_release',
              triggerText: `New feature release: ${featureRelease.title}`,
            })
          : '/dashboard/plays',
      color: 'green',
      date: featureRelease.createdAt.toISOString(),
    });
  }

  // Exclude generic anonymous "Page view" from hot signals (e.g. demo)
  const filtered = signals.filter(
    (s) => !(s.headline === 'Page view' && s.description === 'Anonymous page view')
  );

  // Sort by date descending. Edge case: when multiple signals apply to the same division,
  // we show the most recent first (latest by publishedAt/date); each CTA uses one signal per card.
  filtered.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return filtered.slice(0, 10);
}
