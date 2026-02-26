import { prisma } from '@/lib/db';
import { getSuggestedPlays } from '@/lib/plays/engine';
import { buildNextBestActionHref } from '@/lib/dashboard/signal-play-href';

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
    const eventInviteParams = new URLSearchParams({
      playId: 'event_invite',
      signalTitle: 'Celigo CONNECT 2026 — Invitation',
    });
    actions.push({
      companyId: eventCampaign.companyId,
      companyName,
      departmentId: null,
      departmentName: '',
      label: 'Create sales page and invite users to the event',
      ctaLabel: 'Invite users to event',
      ctaHref: `/dashboard/companies/${eventCampaign.companyId}/create-content?${eventInviteParams.toString()}`,
      priority: 0,
    });
  }

  // 1. Suggested plays — take ALL suggestions per company (up to 3), not just the first
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
            ctaHref: buildNextBestActionHref({
              companyId: company.id,
              playId: 'new_buying_group',
              segmentId: dept.id,
              segmentName: deptName,
              triggerText,
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
          ctaHref: `/dashboard/companies/${company.id}/departments/${dept.id}#contacts`,
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
        ctaHref: `/dashboard/companies/${first!.id}`,
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
