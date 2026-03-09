/**
 * Urgency scoring for ActionWorkflows.
 *
 * Wraps the existing calculatePlanUrgency() from plan-urgency.ts,
 * multiplies by the triggering signal's relevance score (1-10),
 * and evaluates RoadmapConditions for additional boosts/suppressions:
 * - event_window: boost when a company event is within N days
 * - product_launch: boost when a recent product launch exists
 * - engagement_threshold: suppress when contact has too few touches
 */

import {
  calculatePlanUrgency,
  type ActiveObjectionForScoring,
} from '@/lib/roadmap/plan-urgency';
import { prisma } from '@/lib/db';
import { ContentType } from '@prisma/client';

type Signal = { type: string; publishedAt: Date | string; relevanceScore?: number };
type ExistingProduct = { contractRenewalDate: Date | string | null };

type WorkflowUrgencyInput = {
  phaseIndex: number | null;
  previewPayload: {
    triggerSignalType?: string;
    objectionAddressed?: string;
  } | null;
  triggerSignal?: Signal | null;
  signals: Signal[];
  existingProducts: ExistingProduct[];
  activeObjections?: ActiveObjectionForScoring[];
};

export function calculateWorkflowUrgency(input: WorkflowUrgencyInput): number {
  const base = calculatePlanUrgency(
    {
      phaseIndex: input.phaseIndex,
      previewPayload: input.previewPayload,
    },
    input.signals,
    input.existingProducts,
    input.activeObjections,
  );

  const relevance = input.triggerSignal?.relevanceScore ?? 0;
  const multiplier = 1 + relevance / 20;

  return Math.round(base * multiplier);
}

type ConditionConfig = {
  defaultDays?: number;
  daysWindow?: number;
  minTouchpoints?: number;
};

type ConditionContext = {
  companyId: string;
  contactId?: string;
};

/**
 * Evaluate RoadmapConditions for a company and return a combined multiplier.
 * Returns a number >= 0 that should be applied to the base urgency score.
 */
export async function evaluateConditions(
  roadmapId: string,
  ctx: ConditionContext,
): Promise<number> {
  const conditions = await prisma.roadmapCondition.findMany({
    where: { roadmapId, isActive: true },
  });

  if (conditions.length === 0) return 1.0;

  let multiplier = 1.0;

  for (const condition of conditions) {
    const config = (condition.config ?? {}) as ConditionConfig;

    switch (condition.type) {
      case 'event_window': {
        const roadmap = await prisma.adaptiveRoadmap.findUnique({
          where: { id: roadmapId },
          select: { userId: true },
        });
        if (!roadmap?.userId) break;
        const upcomingEvent = await prisma.contentLibrary.findFirst({
          where: {
            userId: roadmap.userId,
            type: ContentType.CompanyEvent,
            isActive: true,
          },
        });
        if (upcomingEvent) multiplier *= 1.3;
        break;
      }

      case 'product_launch': {
        const days = config.defaultDays ?? 7;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const recentLaunch = await prisma.catalogProduct.findFirst({
          where: {
            userId: (
              await prisma.adaptiveRoadmap.findUnique({
                where: { id: roadmapId },
                select: { userId: true },
              })
            )?.userId,
            updatedAt: { gte: since },
          },
        });
        if (recentLaunch) multiplier *= 1.2;
        break;
      }

      case 'engagement_threshold': {
        if (!ctx.contactId) break;
        const minTouch = config.minTouchpoints ?? 3;
        const touchCount = await prisma.activity.count({
          where: {
            companyId: ctx.companyId,
            OR: [
              { type: 'email_sent' },
              { type: 'EMAIL_SENT' },
              { type: 'meeting' },
              { type: 'MEETING_SCHEDULED' },
              { type: 'Meeting' },
            ],
          },
        });
        if (touchCount < minTouch) multiplier *= 0.7;
        break;
      }
    }
  }

  return multiplier;
}

/**
 * Full urgency calculation that includes condition evaluation.
 * Use this when you have access to the roadmap/company context.
 */
export async function calculateWorkflowUrgencyWithConditions(
  input: WorkflowUrgencyInput & { roadmapId?: string; companyId?: string; contactId?: string },
): Promise<number> {
  const baseScore = calculateWorkflowUrgency(input);

  if (!input.roadmapId || !input.companyId) return baseScore;

  const conditionMultiplier = await evaluateConditions(input.roadmapId, {
    companyId: input.companyId,
    contactId: input.contactId,
  });

  return Math.round(baseScore * conditionMultiplier);
}
