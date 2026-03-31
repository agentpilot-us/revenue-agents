/**
 * On signal: resolve play via SignalPlayMapping (and optional AccountPlayActivation),
 * then createPlayRunFromTemplate instead of creating an ActionWorkflow.
 * Supports SignalPlayMapping.conditions: accountTier, accountTiers, arr_gt, arr_lt.
 */

import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from './create-play-run';
import { conditionsMatch, type ConditionsContext } from './signal-mapping-conditions';

export type SignalInput = {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  summary: string;
  relevanceScore: number;
  suggestedPlay: string | null;
};

const PRIORITY_ORDER: Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'> = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
];

export { conditionsMatch } from './signal-mapping-conditions';

type MappingWithTemplate = {
  id: string;
  signalType: string;
  playTemplateId: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  conditions: unknown;
  playTemplate: { id: string; name: string };
};

function pickCandidate(list: MappingWithTemplate[]): MappingWithTemplate {
  return [...list].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  )[0];
}

export type SignalResolutionPreview = {
  signalTypeNorm: string;
  conditionsContext: ConditionsContext;
  roadmapId: string | null;
  matchingMappingsCount: number;
  candidate: {
    mappingId: string;
    signalType: string;
    priority: string;
    playTemplateId: string;
    playTemplateName: string;
  } | null;
  /** Picked from templates that are also activated for this roadmap */
  activationNarrowed: boolean;
  /** Roadmap exists, activations did not overlap mappings — fell back to any matching mapping */
  activationBroadenedFallback: boolean;
  reasonNoMatch?: string;
};

/**
 * Dry-run resolution: same template pick as matchSignalToPlayRun, without creating a PlayRun.
 */
export async function resolveSignalToPlayCandidate(
  signal: SignalInput,
): Promise<SignalResolutionPreview> {
  const signalTypeNorm = signal.type.trim().toLowerCase();

  const [mappings, roadmap, companyContext] = await Promise.all([
    prisma.signalPlayMapping.findMany({
      where: {
        userId: signal.userId,
        playTemplate: { status: 'ACTIVE' },
      },
      include: {
        playTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.adaptiveRoadmap.findFirst({
      where: { userId: signal.userId, companyId: signal.companyId },
      select: { id: true },
    }),
    prisma.company.findFirst({
      where: { id: signal.companyId, userId: signal.userId },
      select: { accountType: true },
    }),
  ]);

  const arrResult = await prisma.companyProduct.aggregate({
    where: { companyId: signal.companyId },
    _sum: { arr: true },
  });
  const totalArr = Number(arrResult._sum?.arr ?? 0);
  const conditionsContext: ConditionsContext = {
    accountTier: companyContext?.accountType ?? null,
    totalArr,
  };

  const matchingMappings = mappings.filter((m) => {
    const mappingType = m.signalType.trim().toLowerCase();
    const typeMatch =
      mappingType === signalTypeNorm ||
      signalTypeNorm.includes(mappingType) ||
      mappingType.includes(signalTypeNorm);
    if (!typeMatch) return false;
    return conditionsMatch(m.conditions, conditionsContext);
  }) as MappingWithTemplate[];

  if (matchingMappings.length === 0) {
    return {
      signalTypeNorm,
      conditionsContext,
      roadmapId: roadmap?.id ?? null,
      matchingMappingsCount: 0,
      candidate: null,
      activationNarrowed: false,
      activationBroadenedFallback: false,
      reasonNoMatch: 'No SignalPlayMapping matched this signal type and conditions (or template inactive).',
    };
  }

  let activationNarrowed = false;
  let activationBroadenedFallback = false;
  let candidate = pickCandidate(matchingMappings);

  if (roadmap) {
    const activations = await prisma.accountPlayActivation.findMany({
      where: { roadmapId: roadmap.id, isActive: true },
      select: { playTemplateId: true },
    });
    const allowedIds = new Set(activations.map((a) => a.playTemplateId));
    const allowed = matchingMappings.filter((m) => allowedIds.has(m.playTemplateId));
    if (allowed.length > 0) {
      candidate = pickCandidate(allowed);
      activationNarrowed = true;
    } else {
      candidate = pickCandidate(matchingMappings);
      activationBroadenedFallback = true;
    }
  }

  return {
    signalTypeNorm,
    conditionsContext,
    roadmapId: roadmap?.id ?? null,
    matchingMappingsCount: matchingMappings.length,
    candidate: {
      mappingId: candidate.id,
      signalType: candidate.signalType,
      priority: candidate.priority,
      playTemplateId: candidate.playTemplateId,
      playTemplateName: candidate.playTemplate.name,
    },
    activationNarrowed,
    activationBroadenedFallback,
  };
}

/**
 * Match a signal to a PlayTemplate via SignalPlayMapping, optionally scoped by
 * AccountPlayActivation for the company's roadmap. Evaluates conditions (accountTier, arr_gt/arr_lt).
 * Creates a PlayRun when a match is found.
 */
export async function matchSignalToPlayRun(signal: SignalInput): Promise<{ created: boolean; playRunId?: string }> {
  const preview = await resolveSignalToPlayCandidate(signal);
  if (!preview.candidate) return { created: false };

  const signalTypeNorm = preview.signalTypeNorm;
  const roadmap =
    preview.roadmapId ?
      { id: preview.roadmapId }
    : null;

  let targetContact: { name: string; email?: string | null; title?: string | null } | null =
    null;
  let roadmapTargetId: string | null = null;
  let targetContactId: string | null = null;
  // Resolve RoadmapTarget: prefer a target whose department type matches the signal context, fall back to first target.
  if (roadmap) {
    const SIGNAL_DEPT_HINTS: Record<string, string[]> = {
      exec_hire: ['ENGINEERING', 'PRODUCT', 'IT_INFRASTRUCTURE'],
      earnings_beat: ['FINANCE', 'ENGINEERING'],
      competitor_detected: ['ENGINEERING', 'PRODUCT'],
      product_launch: ['ENGINEERING', 'PRODUCT'],
      expansion: ['ENGINEERING', 'PRODUCT', 'OPERATIONS'],
      renewal: ['IT_INFRASTRUCTURE', 'PROCUREMENT', 'FINANCE'],
    };
    const deptHints = SIGNAL_DEPT_HINTS[signalTypeNorm] ?? [];
    const allTargets = await prisma.roadmapTarget.findMany({
      where: { roadmapId: roadmap.id },
      include: {
        companyDepartment: { select: { type: true } },
        contacts: {
          take: 1,
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true, title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    let bestTarget = allTargets.find(
      (t) => t.companyDepartment?.type && deptHints.includes(t.companyDepartment!.type),
    );
    if (!bestTarget && allTargets.length > 0) {
      bestTarget = allTargets[0];
    }
    if (bestTarget) {
      roadmapTargetId = bestTarget.id;
      const firstContact = bestTarget.contacts?.[0]?.contact ?? null;
      if (firstContact) {
        targetContactId = firstContact.id;
        targetContact = {
          name: [firstContact.firstName, firstContact.lastName].filter(Boolean).join(' ') || 'Unknown',
          email: firstContact.email,
          title: firstContact.title,
        };
      }
    }
  }

  const playRun = await createPlayRunFromTemplate({
    userId: signal.userId,
    companyId: signal.companyId,
    playTemplateId: preview.candidate.playTemplateId,
    accountSignalId: signal.id,
    targetContact,
    targetContactId,
    roadmapTargetId: roadmapTargetId ?? undefined,
    triggerType: 'SIGNAL',
    triggerContext: { signalSummary: signal.summary, signalTitle: signal.title },
  });

  await prisma.accountSignal
    .update({
      where: { id: signal.id },
      data: { status: 'acted' },
    })
    .catch(() => {});

  return { created: true, playRunId: playRun.id };
}
