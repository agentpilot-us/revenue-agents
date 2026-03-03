import { prisma } from '@/lib/db';
import { getSuggestedPlays } from '@/lib/plays/engine';
import { buildNextBestActionHref } from '@/lib/dashboard/signal-play-href';
import { buildContentUrl, type ContentChannel } from '@/lib/urls/content';

/** Build company page URL with 6-tab set (Spec 1). */
function companyTabUrl(
  companyId: string,
  opts: {
    tab: 'overview' | 'buying-groups' | 'contacts' | 'content' | 'engagement' | 'signals';
    division?: string | null;
    type?: string;
    signal?: string;
    action?: string;
    contentFilter?: string;
  }
): string {
  const params = new URLSearchParams();
  params.set('tab', opts.tab);
  if (opts.division) params.set('division', opts.division);
  if (opts.type) params.set('type', opts.type);
  if (opts.signal) params.set('signal', opts.signal);
  if (opts.action) params.set('action', opts.action);
  if (opts.contentFilter) params.set('contentFilter', opts.contentFilter);
  return `/dashboard/companies/${companyId}?${params.toString()}`;
}

export type NextBestActionItem = {
  companyId: string;
  companyName: string;
  departmentId: string | null;
  departmentName: string;
  label: string;
  ctaLabel: string;
  ctaHref: string;
  playId?: string;
  priority: number; // lower = higher priority
  // Roadmap division card (enterprise_expansion)
  divisionTargetId?: string;
  stage?: string;
  situationSummary?: string;
  recommendation?: string;
  objectiveLine?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  urgency?: string;
};

/**
 * Returns next best actions from suggested plays, then fallbacks from account state.
 * Never returns empty: at least one action (e.g. add first company) is returned.
 */
const EVENT_CAMPAIGN_SLUG = 'celigo-connect-2026';

export async function getNextBestActions(
  userId: string
): Promise<NextBestActionItem[]> {
  const [companies, eventCampaign] = await Promise.all([
    prisma.company.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        departments: {
          include: {
            _count: { select: { contacts: true } },
            segmentCampaigns: { select: { id: true } },
          },
        },
      },
    }),
    prisma.segmentCampaign.findFirst({
      where: { slug: EVENT_CAMPAIGN_SLUG, company: { userId } },
      select: { id: true, companyId: true },
    }),
  ]);

  const actions: NextBestActionItem[] = [];

  // 0. Event invite: sales page builder first, then choose contacts to invite (workflow for learning)
  if (eventCampaign) {
    const companyName =
      companies.find((c) => c.id === eventCampaign.companyId)?.name ?? '';
    actions.push({
      companyId: eventCampaign.companyId,
      companyName,
      departmentId: null,
      departmentName: '',
      label: 'Create sales page and invite users to the event',
      ctaLabel: 'Invite users to event',
      ctaHref: buildContentUrl({
        companyId: eventCampaign.companyId,
        channel: 'sales_page',
      }),
      priority: 0,
    });
  }

  // 1. Recommended plans — take ALL suggestions per company (up to 3), not just the first
  for (const company of companies) {
    const suggestions = await getSuggestedPlays(company.id, userId);

    for (const suggestion of suggestions) {
      const priority =
        suggestion.play.id === 'new_buying_group' ? 0
        : suggestion.play.id === 'feature_release' ? 1
        : suggestion.play.id === 'event_invite' ? 1
        : suggestion.play.id === 're_engagement' ? 2
        : suggestion.play.id === 'champion_enablement' ? 2
        : 3;

      actions.push({
        companyId: company.id,
        companyName: company.name,
        departmentId: suggestion.segment.id,
        departmentName: suggestion.segment.name,
        label: `${company.name} — ${suggestion.triggerText}`,
        ctaLabel: `Run "${suggestion.play.name}"`,
        ctaHref: buildNextBestActionHref({
          companyId: company.id,
          playId: suggestion.play.id,
          segmentId: suggestion.segment.id,
          segmentName: suggestion.segment.name,
          triggerText: suggestion.triggerText,
        }),
        playId: suggestion.play.id,
        priority,
      });
    }
  }

  // 2. Fallbacks: departments with contacts but no campaign → Open New Buying Group
  for (const company of companies) {
    for (const dept of company.departments) {
      const contactCount = dept._count.contacts;
      const hasCampaign = dept.segmentCampaigns.length > 0;
      const deptName = dept.customName ?? dept.type.replace(/_/g, ' ');
      if (contactCount > 0 && !hasCampaign) {
        const already = actions.some(
          (a) =>
            a.companyId === company.id &&
            a.departmentId === dept.id &&
            a.playId === 'new_buying_group'
        );
        if (!already) {
          const triggerText = `${deptName} has ${contactCount} contact${contactCount !== 1 ? 's' : ''} but no sales page`;
          actions.push({
            companyId: company.id,
            companyName: company.name,
            departmentId: dept.id,
            departmentName: deptName,
            label: `${company.name} — ${triggerText}`,
            ctaLabel: 'Run "Open New Buying Group"',
            ctaHref: buildContentUrl({
              companyId: company.id,
              divisionId: dept.id,
              channel: 'sales_page',
            }),
            playId: 'new_buying_group',
            priority: 0,
          });
        }
      }
    }
  }

  // 3. Fallbacks: departments with 0 contacts → Find contacts
  for (const company of companies) {
    for (const dept of company.departments) {
      const contactCount = dept._count.contacts;
      const deptName = dept.customName ?? dept.type.replace(/_/g, ' ');
      if (contactCount === 0) {
        actions.push({
          companyId: company.id,
          companyName: company.name,
          departmentId: dept.id,
          departmentName: deptName,
          label: `${company.name} — Find contacts for ${deptName}`,
          ctaLabel: 'Find contacts',
          ctaHref: companyTabUrl(company.id, {
            tab: 'contacts',
            division: dept.id,
            action: 'find',
          }),
          priority: 3,
        });
      }
    }
  }

  // Dedupe by company+department+play (keep first)
  const seen = new Set<string>();
  const deduped = actions.filter((a) => {
    const key = `${a.companyId}:${a.departmentId ?? ''}:${a.ctaLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => a.priority - b.priority);

  if (deduped.length === 0 && companies.length === 0) {
    return [
      {
        companyId: '',
        companyName: '',
        departmentId: null,
        departmentName: '',
        label: 'Add your first target company to get started',
        ctaLabel: 'Add company',
        ctaHref: '/dashboard/companies/new',
        priority: 10,
      },
    ];
  }

  if (deduped.length === 0 && companies.length > 0) {
    const first = companies[0];
    return [
      {
        companyId: first!.id,
        companyName: first!.name,
        departmentId: null,
        departmentName: '',
        label: `Open ${first!.name} to see next steps`,
        ctaLabel: 'Open account',
        ctaHref: companyTabUrl(first!.id, { tab: 'overview' }),
        priority: 5,
      },
    ];
  }

  return deduped.slice(0, 8); // show full play variety
}

/**
 * Same as getNextBestActions but can return more items for "Next up" list.
 */
export async function getNextUpSuggestions(
  userId: string
): Promise<NextBestActionItem[]> {
  const actions = await getNextBestActions(userId);
  if (actions.length <= 1 && actions[0]?.ctaHref === '/dashboard/companies/new') {
    return actions;
  }
  return actions.slice(0, 8);
}

const PERSONAS_NEEDED = 3;

/**
 * Roadmap-driven next best actions for enterprise_expansion: division-specific
 * recommendations (research, create page placeholder, view page, find more contacts).
 */
export async function getNextBestActionsFromRoadmap(
  userId: string,
  roadmapId: string,
  objectiveGoalText: string
): Promise<NextBestActionItem[]> {
  const { getDivisionCardsForRadar } = await import('@/lib/dashboard/division-radar');
  const [data, salesMapPlans] = await Promise.all([
    getDivisionCardsForRadar(userId, roadmapId),
    prisma.roadmapPlan.findMany({
      where: {
        roadmapId,
        salesMapTemplateId: { not: null },
        status: { in: ['pending', 'approved'] },
      },
      include: {
        target: {
          select: {
            id: true,
            name: true,
            companyId: true,
            companyDepartmentId: true,
            company: { select: { name: true } },
            companyDepartment: { select: { customName: true, type: true } },
          },
        },
      },
      orderBy: [{ urgencyScore: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    }),
  ]);

  const actions: NextBestActionItem[] = [];

  // Sales Map plan-based NBA cards (sorted by urgencyScore, highest first)
  for (const plan of salesMapPlans) {
    const pp = plan.previewPayload as Record<string, string | undefined> | null;
    const title = pp?.title ?? 'Untitled Plan';
    const contentType = pp?.contentType ?? 'email';
    const companyId = plan.target?.companyId ?? '';
    const companyName = plan.target?.company?.name ?? '';
    const dept = plan.target?.companyDepartment;
    const deptName = dept?.customName ?? dept?.type?.replace(/_/g, ' ') ?? '';
    const divisionId = plan.target?.companyDepartmentId ?? undefined;

    const channelMap: Record<string, ContentChannel> = {
      email: 'email',
      event_invite: 'email',
      presentation: 'presentation',
      one_pager: 'sales_page',
      roi_deck: 'presentation',
      case_study: 'email',
    };
    const channel: ContentChannel = channelMap[contentType] ?? 'email';

    const urgency = plan.urgencyScore ?? 0;
    const priority = urgency > 80 ? -2 : urgency > 50 ? -1 : 0;

    actions.push({
      companyId,
      companyName,
      departmentId: plan.target?.companyDepartmentId ?? null,
      departmentName: deptName,
      label: `${companyName} — ${title}`,
      ctaLabel: plan.status === 'approved' ? 'Draft Content' : 'Review Plan',
      ctaHref:
        plan.status === 'approved'
          ? buildContentUrl({ companyId, divisionId, channel })
          : '/dashboard/roadmap',
      priority,
      divisionTargetId: plan.target?.id,
      situationSummary: pp?.description,
      recommendation: title,
      urgency: urgency > 80 ? 'high' : urgency > 50 ? 'medium' : 'low',
    });
  }

  if (!data || data.divisions.length === 0) {
    actions.sort((a, b) => a.priority - b.priority);
    return actions.slice(0, 8);
  }

  let divPriority = 1;
  const isExpansion = (stage: string) =>
    stage === 'Expansion Target' || stage === 'Active Program';

  for (const d of data.divisions) {
    const contacts = d.contactCount;
    const salesPage = d.salesPageStatus;
    const hasPage = salesPage === 'live' || salesPage === 'placeholder';

    let situationSummary: string;
    let recommendation: string;
    let ctaLabel: string;
    let ctaHref: string;
    let secondaryCtaLabel: string | undefined;
    let secondaryCtaHref: string | undefined;

    const divId = d.companyDepartmentId ?? undefined;
    if (contacts === 0) {
      situationSummary = `No contacts identified yet.`;
      recommendation = `Research the buying group to identify VP of AI/ML, LOB Owner, and IT Architecture Lead before building a sales page.`;
      ctaLabel = 'Research Buying Group';
      ctaHref = companyTabUrl(d.companyId, { tab: 'contacts', division: divId, action: 'find' });
      secondaryCtaLabel = 'View Division';
      secondaryCtaHref = companyTabUrl(d.companyId, { tab: 'overview', division: divId });
    } else if (contacts < PERSONAS_NEEDED) {
      if (hasPage) {
        situationSummary = `Contacts: ${contacts} identified — buying group incomplete.`;
        recommendation = `Expand the buying group — you have ${contacts} of ${PERSONAS_NEEDED}.`;
        ctaLabel = 'Find More Contacts';
        ctaHref = companyTabUrl(d.companyId, { tab: 'contacts', division: divId, action: 'find' });
      } else {
        situationSummary = `${contacts} contact${contacts !== 1 ? 's' : ''} identified, but no sales page.`;
        recommendation = `Create a division-specific sales page to share with the buying group.`;
        ctaLabel = 'Create Sales Page Placeholder';
        ctaHref = buildContentUrl({
          companyId: d.companyId,
          divisionId: divId,
          channel: 'sales_page',
        });
        secondaryCtaLabel = contacts > 1 ? 'View Contacts' : 'View Contact';
        secondaryCtaHref = companyTabUrl(d.companyId, { tab: 'contacts', division: divId });
      }
    } else if (!hasPage) {
      situationSummary = `${contacts} contacts identified, no sales page.`;
      recommendation = `Buying group is mapped. Build a sales page to begin engagement.`;
      ctaLabel = 'Create Sales Page Placeholder';
      ctaHref = buildContentUrl({
        companyId: d.companyId,
        divisionId: divId,
        channel: 'sales_page',
      });
      secondaryCtaLabel = 'View Contacts';
      secondaryCtaHref = companyTabUrl(d.companyId, { tab: 'contacts', division: divId });
    } else if (salesPage === 'placeholder') {
      situationSummary = `Sales page placeholder created.`;
      recommendation = `Waiting for HTML content.`;
      ctaLabel = 'View Placeholder';
      ctaHref = d.salesPageSlug ? `/go/${d.salesPageSlug}` : companyTabUrl(d.companyId, { tab: 'overview' });
      secondaryCtaLabel = 'View Division';
      secondaryCtaHref = companyTabUrl(d.companyId, { tab: 'overview', division: divId });
    } else {
      situationSummary = `Page is LIVE. ${contacts} contact${contacts !== 1 ? 's' : ''}. Consider expanding buying group.`;
      recommendation = `Page is live. Consider expanding the buying group or starting outreach.`;
      ctaLabel = 'View Page';
      ctaHref = d.salesPageSlug ? `/go/${d.salesPageSlug}` : companyTabUrl(d.companyId, { tab: 'overview' });
      secondaryCtaLabel = 'Find More Contacts';
      secondaryCtaHref = companyTabUrl(d.companyId, { tab: 'contacts', division: divId });
    }

    actions.push({
      companyId: d.companyId,
      companyName: d.companyName,
      departmentId: d.companyDepartmentId,
      departmentName: d.name,
      label: `${d.companyName} — ${d.name}: ${situationSummary}`,
      ctaLabel,
      ctaHref,
      priority: divPriority++,
      divisionTargetId: d.targetId,
      stage: d.stage,
      situationSummary,
      recommendation,
      objectiveLine: isExpansion(d.stage) ? `Advances objective: ${objectiveGoalText}` : undefined,
      secondaryCtaLabel,
      secondaryCtaHref,
    });
  }

  actions.sort((a, b) => a.priority - b.priority);
  return actions.slice(0, 8);
}
