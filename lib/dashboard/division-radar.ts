/**
 * Division-first Account Radar for enterprise_expansion roadmap.
 * Builds data for division cards: stage, coverage, sales page status, last signal.
 */

import { prisma } from '@/lib/db';

const STAGE_PRIORITY: Record<string, number> = {
  'Expansion Target': 0,
  'Active Program': 1,
  'Strategic Platform': 2,
  'Emerging': 3,
  'Building Relationships': 4,
  'Active Partner': 5,
};

export type DivisionCard = {
  targetId: string;
  name: string;
  stage: string;
  contactCount: number;
  coveragePct: number;
  salesPageStatus: 'live' | 'placeholder' | 'none';
  salesPageSlug?: string;
  lastSignalAt: Date | null;
  companyId: string;
  companyName: string;
  companyDepartmentId: string | null;
};

const PERSONAS_TARGET = 3; // default for coverage % denominator

/**
 * Sort division targets by Roadmap relevance: expansion targets with activity first,
 * then active programs, strategic platform, emerging, then no signals/contacts.
 */
function sortDivisionsByPriority<T extends { stage: string | null; lastSignalAt?: Date | null; contacts?: unknown[] }>(
  divisions: T[]
): T[] {
  return [...divisions].sort((a, b) => {
    const stageA = (a.stage ?? '') || 'Other';
    const stageB = (b.stage ?? '') || 'Other';
    const prioA = STAGE_PRIORITY[stageA] ?? 10;
    const prioB = STAGE_PRIORITY[stageB] ?? 10;
    if (prioA !== prioB) return prioA - prioB;
    const signalA = a.lastSignalAt ? new Date(a.lastSignalAt).getTime() : 0;
    const signalB = b.lastSignalAt ? new Date(b.lastSignalAt).getTime() : 0;
    return signalB - signalA;
  });
}

export async function getDivisionCardsForRadar(
  userId: string,
  roadmapId: string
): Promise<{ divisions: DivisionCard[]; companyName: string; objectiveSummary: string; expansionTargetCount: number } | null> {
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { id: roadmapId, userId },
    select: {
      objective: true,
      targets: {
        where: { targetType: 'division' },
        include: {
          company: { select: { id: true, name: true } },
          companyDepartment: { select: { id: true, customName: true } },
          _count: { select: { contacts: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!roadmap || roadmap.targets.length === 0) return null;

  const divisionTargets = roadmap.targets as Array<{
    id: string;
    name: string;
    stage: string | null;
    lastSignalAt: Date | null;
    companyId: string | null;
    companyDepartmentId: string | null;
    company: { id: string; name: string } | null;
    companyDepartment: { id: string; customName: string | null } | null;
    _count: { contacts: number };
  }>;

  const companyIds = [...new Set(divisionTargets.map((t) => t.company?.id).filter(Boolean))] as string[];
  const departmentIds = [...new Set(divisionTargets.map((t) => t.companyDepartment?.id).filter(Boolean))] as string[];

  const campaigns = await prisma.segmentCampaign.findMany({
    where: {
      userId,
      companyId: { in: companyIds },
      departmentId: { in: departmentIds.length > 0 ? departmentIds : undefined },
    },
    select: { companyId: true, departmentId: true, status: true, slug: true },
  });
  const campaignByDept = new Map<string, 'live' | 'placeholder' | 'none'>();
  const slugByDept = new Map<string, string>();
  for (const c of campaigns) {
    const key = `${c.companyId}:${c.departmentId ?? ''}`;
    campaignByDept.set(key, (c.status === 'placeholder' ? 'placeholder' : 'live'));
    if (c.slug) slugByDept.set(key, c.slug);
  }

  const divisions: DivisionCard[] = divisionTargets.map((t) => {
    const key = `${t.company?.id ?? ''}:${t.companyDepartment?.id ?? ''}`;
    const campaignStatus = campaignByDept.get(key) ?? 'none';
    const contactCount = t._count.contacts;
    const coveragePct =
      PERSONAS_TARGET <= 0 ? 0 : Math.min(100, Math.round((contactCount / PERSONAS_TARGET) * 100));
    return {
      targetId: t.id,
      name: t.companyDepartment?.customName ?? t.name,
      stage: t.stage ?? '—',
      contactCount,
      coveragePct,
      salesPageStatus: campaignStatus,
      salesPageSlug: slugByDept.get(key),
      lastSignalAt: t.lastSignalAt,
      companyId: t.company?.id ?? '',
      companyName: t.company?.name ?? 'Account',
      companyDepartmentId: t.companyDepartment?.id ?? null,
    };
  });

  const sorted = sortDivisionsByPriority(divisions);
  const objective = roadmap.objective as { goalText?: string } | null;
  const expansionTargetCount = divisions.filter(
    (d) => d.stage === 'Expansion Target' || d.stage === 'Active Program'
  ).length;

  const companyName = divisionTargets[0]?.company?.name ?? 'Account';
  return {
    divisions: sorted,
    companyName,
    objectiveSummary: objective?.goalText ?? 'Land new use cases at target account.',
    expansionTargetCount,
  };
}
