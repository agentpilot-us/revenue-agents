/**
 * Urgency scoring for Sales Map plans (RoadmapPlan rows).
 *
 * Formula:
 *   urgencyScore = basePhaseScore + signalBoost + renewalProximity + objectionSeverity
 *
 * Ensures signal-driven plans can jump ahead of earlier phases.
 */

type PlanForScoring = {
  phaseIndex: number | null;
  previewPayload: {
    triggerSignalType?: string;
    objectionAddressed?: string;
  } | null;
};

type Signal = {
  type: string;
  publishedAt: Date | string;
};

type ExistingProduct = {
  contractRenewalDate: Date | string | null;
};

/** Active objections filtered for this plan (e.g. by division). Used for objectionSeverity bonus. */
export type ActiveObjectionForScoring = { severity?: string; status?: string };

const BASE_PHASE_SCORES: Record<number, number> = {
  1: 100,
  2: 70,
  3: 40,
  4: 20,
};

function computeObjectionSeverity(
  plan: PlanForScoring,
  activeObjectionsForPlan?: ActiveObjectionForScoring[]
): number {
  const fromPayload = plan.previewPayload?.objectionAddressed ? 15 : 0;
  if (!activeObjectionsForPlan?.length) return fromPayload;

  const active = activeObjectionsForPlan.filter((o) => o.status !== 'resolved' && o.status !== 'addressed');
  if (active.length === 0) return fromPayload;

  const hasHigh = active.some((o) => (o.severity ?? '').toLowerCase() === 'high');
  const hasMedium = active.some((o) => (o.severity ?? '').toLowerCase() === 'medium');
  if (hasHigh) return 25;
  if (hasMedium) return 15;
  return 10;
}

export function calculatePlanUrgency(
  plan: PlanForScoring,
  signals: Signal[],
  existingProducts: ExistingProduct[],
  activeObjectionsForPlan?: ActiveObjectionForScoring[]
): number {
  const phaseIndex = plan.phaseIndex ?? 1;
  const basePhaseScore = BASE_PHASE_SCORES[phaseIndex] ?? 50;

  const signalBoost = computeSignalBoost(plan, signals);
  const renewalProximity = computeRenewalProximity(existingProducts);
  const objectionSeverity = computeObjectionSeverity(plan, activeObjectionsForPlan);

  return basePhaseScore + signalBoost + renewalProximity + objectionSeverity;
}

function computeSignalBoost(plan: PlanForScoring, signals: Signal[]): number {
  const triggerType = plan.previewPayload?.triggerSignalType;
  if (!triggerType || signals.length === 0) return 0;

  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  for (const signal of signals) {
    if (signal.type !== triggerType) continue;
    const age = now - new Date(signal.publishedAt).getTime();
    if (age <= SEVEN_DAYS) return 50;
    if (age <= THIRTY_DAYS) return 20;
  }

  return 0;
}

function computeRenewalProximity(existingProducts: ExistingProduct[]): number {
  if (existingProducts.length === 0) return 0;

  const now = Date.now();
  let minDaysOut = Infinity;

  for (const ep of existingProducts) {
    if (!ep.contractRenewalDate) continue;
    const renewalMs = new Date(ep.contractRenewalDate).getTime();
    const daysOut = (renewalMs - now) / (24 * 60 * 60 * 1000);
    if (daysOut > 0 && daysOut < minDaysOut) {
      minDaysOut = daysOut;
    }
  }

  if (minDaysOut < 60) return 60;
  if (minDaysOut < 90) return 30;
  if (minDaysOut < 180) return 10;
  return 0;
}

function parseActiveObjections(raw: unknown): Array<{ severity: string; status?: string; divisionId?: string | null }> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is { severity: string; status?: string; divisionId?: string | null } =>
      item != null && typeof item === 'object' && typeof (item as { severity: string }).severity === 'string'
  );
}

/**
 * Batch recalculate urgency scores for all pending plans in a roadmap.
 */
export async function recalculateUrgencyForRoadmap(
  roadmapId: string,
  companyId: string
): Promise<void> {
  const { prisma } = await import('@/lib/db');

  const [plans, signals, existingProducts, company] = await Promise.all([
    prisma.roadmapPlan.findMany({
      where: { roadmapId, status: 'pending' },
      select: { id: true, phaseIndex: true, previewPayload: true, targetId: true, target: { select: { companyDepartmentId: true } } },
    }),
    prisma.accountSignal.findMany({
      where: { companyId },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: { type: true, publishedAt: true },
    }),
    prisma.companyProduct.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      select: { contractRenewalDate: true },
    }),
    prisma.company.findFirst({
      where: { id: companyId },
      select: { activeObjections: true },
    }),
  ]);

  const allObjections = parseActiveObjections(company?.activeObjections);
  const activeOnly = allObjections.filter((o) => (o.status ?? 'active') === 'active');

  await Promise.all(
    plans.map((plan) => {
      const divisionId = plan.target?.companyDepartmentId ?? null;
      const forPlan = divisionId != null
        ? activeOnly.filter((o) => !o.divisionId || o.divisionId === divisionId)
        : activeOnly;
      const score = calculatePlanUrgency(
        {
          phaseIndex: plan.phaseIndex,
          previewPayload: plan.previewPayload as PlanForScoring['previewPayload'],
        },
        signals,
        existingProducts,
        forPlan
      );
      return prisma.roadmapPlan.update({
        where: { id: plan.id },
        data: { urgencyScore: score },
      });
    })
  );
}
