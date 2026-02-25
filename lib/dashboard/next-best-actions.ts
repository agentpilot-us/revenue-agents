import { prisma } from '@/lib/db';
import { getSuggestedPlays } from '@/lib/plays/engine';

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
export async function getNextBestActions(
  userId: string
): Promise<NextBestActionItem[]> {
  const companies = await prisma.company.findMany({
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
  });

  const actions: NextBestActionItem[] = [];

  // 1. Suggested plays (one per company, then flatten and sort)
  for (const company of companies) {
    const suggestions = await getSuggestedPlays(company.id, userId);
    const first = suggestions[0];
    if (first) {
      const priority =
        first.play.id === 'new_buying_group' ? 0 : first.play.id === 'event_invite' ? 1 : 2;
      actions.push({
        companyId: company.id,
        companyName: company.name,
        departmentId: first.segment.id,
        departmentName: first.segment.name,
        label: `${company.name} — ${first.triggerText}`,
        ctaLabel: `Run "${first.play.name}"`,
        ctaHref: `/chat?play=expansion&accountId=${company.id}&segmentId=${first.segment.id}`,
        playId: first.play.id,
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
          actions.push({
            companyId: company.id,
            companyName: company.name,
            departmentId: dept.id,
            departmentName: deptName,
            label: `${company.name} — ${deptName} has ${contactCount} contact${contactCount !== 1 ? 's' : ''} but no sales page`,
            ctaLabel: 'Run "Open New Buying Group"',
            ctaHref: `/chat?play=expansion&accountId=${company.id}&segmentId=${dept.id}`,
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

  // Dedupe by company+department+action type (keep first)
  const seen = new Set<string>();
  const deduped = actions.filter((a) => {
    const key = `${a.companyId}:${a.departmentId ?? ''}:${a.ctaLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by priority then by company
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

  return deduped.slice(0, 5);
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
