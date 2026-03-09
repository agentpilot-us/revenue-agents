/**
 * Match new signals to RoadmapSignalRules and auto-create ActionWorkflows.
 *
 * Uses actual schema fields: rule.category, rule.keywords, rule.priorityWeight,
 * and mapping.templateId. Falls back to the shared template resolver when no
 * explicit templateId is set on the mapping.
 */

import { prisma } from '@/lib/db';
import { assembleWorkflow } from './assemble';
import { resolveTemplateForContext } from './resolve-template';

type Signal = {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  summary: string;
  relevanceScore: number;
  suggestedPlay: string | null;
};

export async function matchSignalToRoadmapRules(signal: Signal): Promise<void> {
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: {
      userId: signal.userId,
      companyId: signal.companyId,
    },
    include: {
      signalRules: {
        orderBy: { priorityWeight: 'desc' },
        include: {
          actionMappings: {
            select: {
              id: true,
              templateId: true,
              actionType: true,
              autonomyLevel: true,
              promptHint: true,
            },
          },
        },
      },
    },
  });

  if (!roadmap || roadmap.signalRules.length === 0) return;

  for (const rule of roadmap.signalRules) {
    if (!matchesRule(signal, rule)) continue;

    const mapping = rule.actionMappings[0];
    if (!mapping) continue;

    const target = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id },
      select: {
        id: true,
        companyDepartmentId: true,
        contacts: {
          take: 1,
          include: { contact: { select: { id: true } } },
        },
      },
    });

    // Resolve template: prefer explicit mapping.templateId, then shared resolver
    let templateId = mapping.templateId ?? undefined;
    if (!templateId) {
      const company = await prisma.company.findFirst({
        where: { id: signal.companyId },
        select: { industry: true },
      });
      const dept = target?.companyDepartmentId
        ? await prisma.companyDepartment.findFirst({
            where: { id: target.companyDepartmentId },
            select: { customName: true, type: true },
          })
        : null;
      templateId =
        (await resolveTemplateForContext({
          userId: signal.userId,
          companyId: signal.companyId,
          signalType: signal.type,
          signalId: signal.id,
          companyIndustry: company?.industry ?? undefined,
          departmentLabel: dept?.customName ?? undefined,
          departmentType: dept?.type ?? undefined,
        })) ?? undefined;
    }
    if (!templateId) continue;

    const plan = await prisma.roadmapPlan.create({
      data: {
        roadmapId: roadmap.id,
        signalId: signal.id,
        signalRuleId: rule.id,
        actionMappingId: mapping.id,
        targetId: target?.id,
        status: 'pending',
        autonomyLevel: mapping.autonomyLevel || 'auto_create',
        matchInfo: {
          ruleName: rule.name,
          ruleCategory: rule.category,
          signalType: signal.type,
          signalTitle: signal.title,
          relevanceScore: signal.relevanceScore,
          templateId,
        },
      },
    });

    try {
      await assembleWorkflow({
        userId: signal.userId,
        companyId: signal.companyId,
        templateId,
        roadmapPlanId: plan.id,
        accountSignalId: signal.id,
        targetDivisionId: target?.companyDepartmentId ?? undefined,
        targetContactId: target?.contacts?.[0]?.contact?.id,
      });

      await prisma.roadmapPlan.update({
        where: { id: plan.id },
        data: { status: 'approved' },
      });
    } catch (err) {
      console.error(
        `Failed to assemble workflow for signal ${signal.id}:`,
        err,
      );
    }

    break;
  }
}

type RuleShape = {
  category: string;
  keywords: string[];
};

function matchesRule(signal: Signal, rule: RuleShape): boolean {
  // Category match: rule.category must match signal.type
  const categoryMatch =
    signal.type.toLowerCase().includes(rule.category.toLowerCase()) ||
    rule.category.toLowerCase().includes(signal.type.toLowerCase());

  if (!categoryMatch) return false;

  // If rule has keywords, at least one must appear in signal text
  if (rule.keywords.length > 0) {
    const text = `${signal.title} ${signal.summary}`.toLowerCase();
    const keywordMatch = rule.keywords.some((kw) =>
      text.includes(kw.toLowerCase()),
    );
    if (!keywordMatch) return false;
  }

  return true;
}
