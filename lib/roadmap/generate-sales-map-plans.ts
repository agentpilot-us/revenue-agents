/**
 * Sales Map Plan Generation Engine
 *
 * Takes a template (with phase structure) + account context, and uses an LLM
 * to generate specific plans within each phase. Returns a preview that the
 * rep reviews before persisting.
 */

import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { prisma } from '@/lib/db';
import { buildExistingStackBlock } from '@/lib/products/resolve-product-framing';
import { calculatePlanUrgency } from './plan-urgency';
import { z } from 'zod';

// Schema for the LLM output
const planGenerationSchema = z.object({
  phases: z.array(
    z.object({
      phaseOrder: z.number(),
      plans: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          targetDivisionName: z.string().optional(),
          targetContactRole: z.string().optional(),
          contentType: z.enum([
            'email',
            'event_invite',
            'presentation',
            'one_pager',
            'case_study',
            'talking_points',
            'roi_deck',
          ]),
          triggerSignalType: z.string().optional(),
          productFraming: z
            .enum(['expansion', 'upgrade', 'prerequisite_met', 'net_new'])
            .optional(),
          existingProductReference: z.string().optional(),
          objectionAddressed: z.string().optional(),
        })
      ),
    })
  ),
});

export type GeneratedPlan = z.infer<typeof planGenerationSchema>['phases'][number]['plans'][number] & {
  phaseOrder: number;
  phaseName: string;
  weekRange: string | null;
};

export type PlanPreview = {
  phases: Array<{
    phaseOrder: number;
    phaseName: string;
    weekRange: string | null;
    plans: GeneratedPlan[];
  }>;
};

/**
 * Generate plans for a roadmap target using a Sales Map template.
 * Returns a preview (dry-run) — does NOT persist to DB.
 */
export async function generateSalesMapPlans(params: {
  roadmapId: string;
  targetId: string;
  templateId: string;
  userId: string;
}): Promise<PlanPreview> {
  const { roadmapId, targetId, templateId, userId } = params;

  // Fetch template with phases
  const template = await prisma.salesMapTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ userId }, { userId: null, isBuiltIn: true }],
    },
    include: {
      phases: { orderBy: { phaseOrder: 'asc' } },
    },
  });

  if (!template) throw new Error('Template not found');

  // Fetch roadmap + target
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { id: roadmapId, userId },
    select: { id: true, objective: true },
  });
  if (!roadmap) throw new Error('Roadmap not found');

  const target = await prisma.roadmapTarget.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, targetType: true, companyId: true, companyDepartmentId: true },
  });
  if (!target) throw new Error('Target not found');
  if (!target.companyId) throw new Error('Target has no linked company');

  const companyId = target.companyId;

  // Fetch account context in parallel
  const [company, divisionTargets, recentSignals, existingStackBlock, productProfiles] =
    await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          industry: true,
          businessOverview: true,
          keyInitiatives: true,
        },
      }),
      prisma.roadmapTarget.findMany({
        where: { roadmapId, targetType: 'division' },
        select: {
          name: true,
          stage: true,
          companyDepartmentId: true,
          companyDepartment: {
            select: {
              customName: true,
              type: true,
              valueProp: true,
              useCase: true,
              objectionHandlers: true,
              contacts: {
                select: { firstName: true, lastName: true, title: true },
                take: 5,
              },
            },
          },
        },
      }),
      prisma.accountSignal.findMany({
        where: { companyId },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        select: { type: true, title: true, summary: true, publishedAt: true },
      }),
      buildExistingStackBlock(companyId, userId),
      prisma.productProfile.findMany({
        where: { userId },
        select: {
          catalogProduct: { select: { name: true } },
          oneLiner: true,
          objectionHandlers: true,
          competitivePositioning: true,
        },
        take: 10,
      }),
    ]);

  if (!company) throw new Error('Company not found');

  // Build the prompt
  const phasesContext = template.phases
    .map((p) => {
      const suggested = Array.isArray(p.suggestedPlanTypes)
        ? (p.suggestedPlanTypes as string[]).join(', ')
        : '';
      return `${p.phaseOrder}. "${p.name}" (${p.weekRange ?? 'flexible'}) -- suggested: ${suggested}`;
    })
    .join('\n');

  const divisionsContext = divisionTargets
    .map((dt) => {
      const deptName = dt.companyDepartment?.customName || dt.companyDepartment?.type || dt.name;
      const contacts = dt.companyDepartment?.contacts
        .map((c) => `${c.firstName ?? ''} ${c.lastName ?? ''} (${c.title ?? ''})`.trim())
        .join(', ');
      const objections = dt.companyDepartment?.objectionHandlers;
      const objBlock = Array.isArray(objections)
        ? (objections as Array<{ objection: string }>).map((o) => o.objection).join('; ')
        : '';
      return `- ${deptName} [${dt.stage ?? 'unknown'}]: ${dt.companyDepartment?.valueProp ?? ''}\n  Contacts: ${contacts || 'none'}\n  Objections: ${objBlock || 'none'}`;
    })
    .join('\n');

  const signalsContext = recentSignals
    .map((s) => `- [${s.type}] ${s.title}: ${s.summary ?? ''}`)
    .join('\n');

  const productProfilesContext = productProfiles
    .map((pp) => {
      const objHandlers = Array.isArray(pp.objectionHandlers)
        ? (pp.objectionHandlers as Array<{ objection: string; response: string }>)
            .map((o) => `"${o.objection}"`)
            .join(', ')
        : '';
      return `- ${pp.catalogProduct.name}: ${pp.oneLiner ?? ''}\n  Known objections: ${objHandlers || 'none'}`;
    })
    .join('\n');

  const keyInitiatives = Array.isArray(company.keyInitiatives)
    ? (company.keyInitiatives as string[]).join(', ')
    : '';

  const system = `You are a B2B sales strategist. Generate specific, actionable plans for each phase of a sales engagement.

TEMPLATE: ${template.name}
PHASES:
${phasesContext}

ACCOUNT: ${company.name} (${company.industry ?? 'Unknown industry'})
${company.businessOverview ? `Overview: ${company.businessOverview}` : ''}
${keyInitiatives ? `Key initiatives: ${keyInitiatives}` : ''}
OBJECTIVE: ${roadmap.objective ?? 'Not specified'}

DIVISIONS:
${divisionsContext || 'No divisions mapped yet'}

RECENT SIGNALS:
${signalsContext || 'No recent signals'}

${existingStackBlock ?? ''}

PRODUCT PROFILES:
${productProfilesContext || 'No product profiles configured'}

For each phase, generate 2-4 specific plans. Each plan must reference:
- A specific division or contact role when applicable
- The existing product relationship (upgrade/complementary/net-new) when relevant
- A specific objection to address when in an objection-handling phase
- A specific signal to leverage when one exists

Keep plans concrete and actionable — each should result in a specific piece of content the rep can create.`;

  const { object } = await generateObject({
    model: getChatModel(),
    schema: planGenerationSchema,
    system,
    prompt: `Generate the phased plan set for ${company.name}. Be specific to this account's context.`,
    maxOutputTokens: 3000,
  });

  // Map to preview format with phase metadata
  const preview: PlanPreview = {
    phases: template.phases.map((templatePhase) => {
      const generatedPhase = object.phases.find(
        (p) => p.phaseOrder === templatePhase.phaseOrder
      );
      return {
        phaseOrder: templatePhase.phaseOrder,
        phaseName: templatePhase.name,
        weekRange: templatePhase.weekRange,
        plans: (generatedPhase?.plans ?? []).map((plan) => ({
          ...plan,
          phaseOrder: templatePhase.phaseOrder,
          phaseName: templatePhase.name,
          weekRange: templatePhase.weekRange,
        })),
      };
    }),
  };

  return preview;
}

/**
 * Persist confirmed plans as RoadmapPlan rows.
 * Called after the rep reviews the preview and clicks "Save to Sales Map".
 */
export async function persistSalesMapPlans(params: {
  roadmapId: string;
  targetId: string;
  templateId: string;
  companyId: string;
  plans: GeneratedPlan[];
}): Promise<{ created: number }> {
  const { roadmapId, targetId, templateId, companyId, plans } = params;

  // Fetch signals, existing products, target division, and active objections for urgency scoring
  const [signals, existingProducts, target, company] = await Promise.all([
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
    prisma.roadmapTarget.findUnique({
      where: { id: targetId },
      select: { companyDepartmentId: true },
    }),
    prisma.company.findFirst({
      where: { id: companyId },
      select: { activeObjections: true },
    }),
  ]);

  const rawObjections = (company?.activeObjections as Array<{ severity?: string; status?: string; divisionId?: string | null }> | null) ?? [];
  const activeObjections = rawObjections.filter((o) => (o.status ?? 'active') === 'active');
  const divisionId = target?.companyDepartmentId ?? null;
  const objectionsForPlan =
    divisionId != null
      ? activeObjections.filter((o) => !o.divisionId || o.divisionId === divisionId)
      : activeObjections;

  const created = await Promise.all(
    plans.map((plan) => {
      const urgencyScore = calculatePlanUrgency(
        {
          phaseIndex: plan.phaseOrder,
          previewPayload: {
            triggerSignalType: plan.triggerSignalType,
            objectionAddressed: plan.objectionAddressed,
          },
        },
        signals,
        existingProducts,
        objectionsForPlan
      );

      return prisma.roadmapPlan.create({
        data: {
          roadmapId,
          targetId,
          salesMapTemplateId: templateId,
          status: 'pending',
          phaseIndex: plan.phaseOrder,
          phaseName: plan.phaseName,
          urgencyScore,
          previewPayload: {
            title: plan.title,
            description: plan.description,
            contentType: plan.contentType,
            weekRange: plan.weekRange,
            targetDivisionName: plan.targetDivisionName,
            targetContactRole: plan.targetContactRole,
            productFraming: plan.productFraming,
            existingProductReference: plan.existingProductReference,
            objectionAddressed: plan.objectionAddressed,
            triggerSignalType: plan.triggerSignalType,
          },
          matchInfo: {
            generatedBy: 'sales_map_planner',
            templateId,
            triggerSignalType: plan.triggerSignalType ?? null,
            targetContactRole: plan.targetContactRole ?? null,
          },
        },
      });
    })
  );

  return { created: created.length };
}
