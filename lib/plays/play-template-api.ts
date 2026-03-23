/**
 * Zod schemas, prompt scaffolding, and DB helpers for PlayTemplate CRUD (builder + APIs).
 */

import {
  type Prisma,
  type PrismaClient,
  PlayCategory,
  PlayContentType,
  PlayScope,
  PlayTemplateStatus,
  PlayTriggerType,
  PhaseGateType,
  ContentChannel,
  ModelTier,
} from '@prisma/client';
import { z } from 'zod';
import { parseAutonomyLevel } from '@/lib/plays/autonomy';

export const SIMPLE_PROMPT_PREFIX = '{{userInstructions}}\n\nAdditional guidance:\n';

export function buildPromptTemplateFromStep(input: {
  promptMode: 'simple' | 'advanced';
  promptHint?: string | null;
  rawPromptTemplate?: string | null;
}): string {
  if (input.promptMode === 'advanced' && (input.rawPromptTemplate?.trim() ?? '').length > 0) {
    return input.rawPromptTemplate!.trim();
  }
  const hint = (input.promptHint ?? '').trim() || 'Describe what the rep should accomplish in this step.';
  return `${SIMPLE_PROMPT_PREFIX}${hint}`;
}

export function splitPromptForEditor(promptTemplate: string): {
  promptMode: 'simple' | 'advanced';
  promptHint: string;
  rawPromptTemplate: string;
} {
  if (promptTemplate.startsWith(SIMPLE_PROMPT_PREFIX)) {
    return {
      promptMode: 'simple',
      promptHint: promptTemplate.slice(SIMPLE_PROMPT_PREFIX.length),
      rawPromptTemplate: '',
    };
  }
  return {
    promptMode: 'advanced',
    promptHint: '',
    rawPromptTemplate: promptTemplate,
  };
}

const playContentTypeZ = z.nativeEnum(PlayContentType);
const contentChannelZ = z.nativeEnum(ContentChannel).nullable().optional();

export const playTemplateStepSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  name: z.string().min(1, 'Step name is required'),
  contentType: playContentTypeZ,
  channel: contentChannelZ,
  contentGenerationType: z.string().default('custom_content'),
  requiresContact: z.boolean().default(false),
  isAutomatable: z.boolean().default(false),
  promptMode: z.enum(['simple', 'advanced']).default('simple'),
  promptHint: z.string().optional().nullable(),
  rawPromptTemplate: z.string().optional().nullable(),
  systemInstructions: z.string().optional().nullable(),
  governanceRules: z.string().optional().nullable(),
});

export const playTemplatePhaseSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  name: z.string().min(1, 'Phase name is required'),
  description: z.string().optional().nullable(),
  offsetDays: z.number().int().optional().nullable(),
  gateType: z.nativeEnum(PhaseGateType).optional(),
  gateConfig: z.record(z.unknown()).optional().nullable(),
  uiPhaseKind: z.string().optional().nullable(),
  steps: z.array(playTemplateStepSchema).min(1).max(1),
});

export const playTemplateCreateBodySchema = z
  .object({
    name: z.string().min(1).trim(),
    description: z.string().optional().nullable(),
    slug: z.string().min(1).optional().nullable(),
    scope: z.nativeEnum(PlayScope),
    category: z.nativeEnum(PlayCategory),
    triggerType: z.nativeEnum(PlayTriggerType),
    signalTypes: z.array(z.string()).optional().default([]),
    anchorField: z.string().optional().nullable(),
    anchorOffsetDays: z.number().int().optional().nullable(),
    defaultAutonomyLevel: z.string().optional().nullable(),
    status: z.nativeEnum(PlayTemplateStatus),
    phases: z.array(playTemplatePhaseSchema).min(1, 'At least one phase is required'),
    companyId: z.string().optional().nullable(),
    activateForCompany: z.boolean().optional(),
    source: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.triggerType === PlayTriggerType.TIMELINE) {
      if (!data.anchorField?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'anchorField is required when triggerType is TIMELINE',
          path: ['anchorField'],
        });
      }
      if (data.anchorOffsetDays == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'anchorOffsetDays is required when triggerType is TIMELINE',
          path: ['anchorOffsetDays'],
        });
      }
    }
    for (let i = 0; i < data.phases.length; i++) {
      const phase = data.phases[i];
      if (phase.steps.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each phase must have exactly one step',
          path: ['phases', i, 'steps'],
        });
      }
    }
  });

export type PlayTemplateCreateBody = z.infer<typeof playTemplateCreateBodySchema>;

function slugifyBase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'play';
}

export async function allocateUniquePlayTemplateSlug(
  prisma: PrismaClient,
  userId: string,
  desiredSlug: string,
  /** When updating, allow keeping the same slug as this template */
  excludeTemplateId?: string,
): Promise<string> {
  const base = slugifyBase(desiredSlug);
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await prisma.playTemplate.findUnique({
      where: { userId_slug: { userId, slug } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeTemplateId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function defaultChannelForContentType(ct: PlayContentType): ContentChannel | null {
  switch (ct) {
    case PlayContentType.EMAIL:
      return ContentChannel.EMAIL;
    case PlayContentType.LINKEDIN_MSG:
      return ContentChannel.LINKEDIN;
    case PlayContentType.SLACK_MSG:
      return ContentChannel.SLACK;
    case PlayContentType.INTERNAL_NOTE:
      return ContentChannel.INTERNAL;
    default:
      return null;
  }
}

function mergePhaseGateConfig(
  gateConfig: Record<string, unknown> | null | undefined,
  uiPhaseKind: string | null | undefined,
): Prisma.InputJsonValue | undefined {
  const base: Record<string, unknown> =
    gateConfig && typeof gateConfig === 'object' && !Array.isArray(gateConfig)
      ? { ...gateConfig }
      : {};
  if (uiPhaseKind?.trim()) {
    base.uiPhaseKind = uiPhaseKind.trim();
  }
  return Object.keys(base).length > 0 ? (base as Prisma.InputJsonValue) : undefined;
}

export type CreatePlayTemplateResult = {
  templateId: string;
  slug: string;
};

/**
 * Creates PlayTemplate + phases + one ContentTemplate per phase in a transaction.
 */
export async function createPlayTemplateFromBody(
  prisma: PrismaClient,
  userId: string,
  body: PlayTemplateCreateBody,
): Promise<CreatePlayTemplateResult> {
  const slug =
    body.slug?.trim() ?
      await allocateUniquePlayTemplateSlug(prisma, userId, body.slug.trim())
    : await allocateUniquePlayTemplateSlug(prisma, userId, body.name);

  const autonomy = body.defaultAutonomyLevel != null ? parseAutonomyLevel(body.defaultAutonomyLevel) : null;

  const template = await prisma.$transaction(async (tx) => {
    const t = await tx.playTemplate.create({
      data: {
        userId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        slug,
        scope: body.scope,
        category: body.category,
        status: body.status,
        triggerType: body.triggerType,
        signalTypes: body.signalTypes ?? [],
        anchorField: body.triggerType === PlayTriggerType.TIMELINE ? body.anchorField?.trim() ?? null : null,
        anchorOffsetDays:
          body.triggerType === PlayTriggerType.TIMELINE ? body.anchorOffsetDays ?? null : null,
        defaultAutonomyLevel: autonomy ?? undefined,
      },
    });

    const sortedPhases = [...body.phases].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );
    for (let i = 0; i < sortedPhases.length; i++) {
      const phase = sortedPhases[i];
      const step = phase.steps[0]!;
      const gateType = phase.gateType ?? PhaseGateType.MANUAL;
      const gateConfig = mergePhaseGateConfig(
        phase.gateConfig as Record<string, unknown> | undefined,
        phase.uiPhaseKind ?? undefined,
      );

      const phaseRow = await tx.playPhaseTemplate.create({
        data: {
          playTemplateId: t.id,
          orderIndex: phase.orderIndex ?? i,
          name: phase.name.trim(),
          description: phase.description?.trim() || null,
          offsetDays: phase.offsetDays ?? null,
          gateType,
          gateConfig: gateConfig ?? undefined,
        },
      });

      const promptTemplate = buildPromptTemplateFromStep({
        promptMode: step.promptMode,
        promptHint: step.promptHint,
        rawPromptTemplate: step.rawPromptTemplate,
      });

      const channel =
        step.channel === null || step.channel === undefined ?
          defaultChannelForContentType(step.contentType)
        : step.channel;

      await tx.contentTemplate.create({
        data: {
          userId,
          phaseTemplateId: phaseRow.id,
          name: step.name.trim(),
          contentType: step.contentType,
          channel: channel ?? undefined,
          modelTier: ModelTier.SONNET,
          promptTemplate,
          systemInstructions: step.systemInstructions?.trim() || null,
          governanceRules: step.governanceRules?.trim() || null,
          contextSources: [],
          contentGenerationType: step.contentGenerationType?.trim() || 'custom_content',
          requiresContact: step.requiresContact,
          isAutomatable: step.isAutomatable,
          orderIndex: step.orderIndex ?? 0,
        },
      });
    }

    return t;
  });

  return { templateId: template.id, slug: template.slug };
}

/**
 * Replace all phases + content for a template (no PlayRuns). Header fields updated from body.
 */
export async function replacePlayTemplateFromBody(
  prisma: PrismaClient,
  userId: string,
  templateId: string,
  body: PlayTemplateCreateBody,
): Promise<{ slug: string }> {
  const existing = await prisma.playTemplate.findFirst({
    where: { id: templateId, userId },
    select: { id: true, slug: true },
  });
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const slug =
    body.slug?.trim() ?
      await allocateUniquePlayTemplateSlug(prisma, userId, body.slug.trim(), templateId)
    : existing.slug;

  const autonomy = body.defaultAutonomyLevel != null ? parseAutonomyLevel(body.defaultAutonomyLevel) : null;

  await prisma.$transaction(async (tx) => {
    const phases = await tx.playPhaseTemplate.findMany({
      where: { playTemplateId: templateId },
      select: { id: true },
    });
    const phaseIds = phases.map((p) => p.id);
    if (phaseIds.length) {
      await tx.contentTemplate.deleteMany({
        where: { phaseTemplateId: { in: phaseIds } },
      });
      await tx.playPhaseTemplate.deleteMany({
        where: { playTemplateId: templateId },
      });
    }

    await tx.playTemplate.update({
      where: { id: templateId },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        slug,
        scope: body.scope,
        category: body.category,
        status: body.status,
        triggerType: body.triggerType,
        signalTypes: body.signalTypes ?? [],
        anchorField: body.triggerType === PlayTriggerType.TIMELINE ? body.anchorField?.trim() ?? null : null,
        anchorOffsetDays:
          body.triggerType === PlayTriggerType.TIMELINE ? body.anchorOffsetDays ?? null : null,
        defaultAutonomyLevel: autonomy ?? undefined,
      },
    });

    const sortedPhases = [...body.phases].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );
    for (let i = 0; i < sortedPhases.length; i++) {
      const phase = sortedPhases[i];
      const step = phase.steps[0]!;
      const gateType = phase.gateType ?? PhaseGateType.MANUAL;
      const gateConfig = mergePhaseGateConfig(
        phase.gateConfig as Record<string, unknown> | undefined,
        phase.uiPhaseKind ?? undefined,
      );

      const phaseRow = await tx.playPhaseTemplate.create({
        data: {
          playTemplateId: templateId,
          orderIndex: phase.orderIndex ?? i,
          name: phase.name.trim(),
          description: phase.description?.trim() || null,
          offsetDays: phase.offsetDays ?? null,
          gateType,
          gateConfig: gateConfig ?? undefined,
        },
      });

      const promptTemplate = buildPromptTemplateFromStep({
        promptMode: step.promptMode,
        promptHint: step.promptHint,
        rawPromptTemplate: step.rawPromptTemplate,
      });

      const channel =
        step.channel === null || step.channel === undefined ?
          defaultChannelForContentType(step.contentType)
        : step.channel;

      await tx.contentTemplate.create({
        data: {
          userId,
          phaseTemplateId: phaseRow.id,
          name: step.name.trim(),
          contentType: step.contentType,
          channel: channel ?? undefined,
          modelTier: ModelTier.SONNET,
          promptTemplate,
          systemInstructions: step.systemInstructions?.trim() || null,
          governanceRules: step.governanceRules?.trim() || null,
          contextSources: [],
          contentGenerationType: step.contentGenerationType?.trim() || 'custom_content',
          requiresContact: step.requiresContact,
          isAutomatable: step.isAutomatable,
          orderIndex: step.orderIndex ?? 0,
        },
      });
    }
  });

  return { slug };
}

export async function clonePlayTemplate(
  prisma: PrismaClient,
  userId: string,
  sourceId: string,
): Promise<CreatePlayTemplateResult> {
  const source = await prisma.playTemplate.findFirst({
    where: { id: sourceId, userId },
    include: {
      phases: {
        orderBy: { orderIndex: 'asc' },
        include: {
          contentTemplates: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  });
  if (!source) {
    throw new Error('NOT_FOUND');
  }

  const newName = `${source.name} (copy)`;
  const baseSlug = `${source.slug}-copy`;
  const slug = await allocateUniquePlayTemplateSlug(prisma, userId, baseSlug);

  const created = await prisma.$transaction(async (tx) => {
    const t = await tx.playTemplate.create({
      data: {
        userId,
        name: newName,
        description: source.description,
        slug,
        scope: source.scope,
        category: source.category,
        status: PlayTemplateStatus.DRAFT,
        triggerType: source.triggerType,
        signalTypes: [...source.signalTypes],
        anchorField: source.anchorField,
        anchorOffsetDays: source.anchorOffsetDays,
        defaultAutonomyLevel: source.defaultAutonomyLevel ?? undefined,
      },
    });

    for (const phase of source.phases) {
      const phaseRow = await tx.playPhaseTemplate.create({
        data: {
          playTemplateId: t.id,
          orderIndex: phase.orderIndex,
          name: phase.name,
          description: phase.description,
          offsetDays: phase.offsetDays ?? undefined,
          gateType: phase.gateType,
          gateConfig: phase.gateConfig === null ? undefined : (phase.gateConfig as Prisma.InputJsonValue),
        },
      });

      for (const ct of phase.contentTemplates) {
        await tx.contentTemplate.create({
          data: {
            userId,
            phaseTemplateId: phaseRow.id,
            name: ct.name,
            contentType: ct.contentType,
            channel: ct.channel ?? undefined,
            modelTier: ct.modelTier,
            promptTemplate: ct.promptTemplate,
            systemInstructions: ct.systemInstructions ?? undefined,
            governanceRules: ct.governanceRules ?? undefined,
            approvedMessaging: ct.approvedMessaging ?? undefined,
            prohibitedContent: ct.prohibitedContent ?? undefined,
            contextSources: [...ct.contextSources],
            targetPersona: ct.targetPersona ?? undefined,
            contentGenerationType: ct.contentGenerationType,
            requiresContact: ct.requiresContact,
            isAutomatable: ct.isAutomatable,
            orderIndex: ct.orderIndex,
          },
        });
      }
    }

    return t;
  });

  return { templateId: created.id, slug: created.slug };
}

export async function maybeActivatePlayTemplateForCompany(
  prisma: PrismaClient,
  userId: string,
  playTemplateId: string,
  companyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });
  if (!roadmap) {
    return {
      ok: false,
      error:
        'No Strategic Account Plan exists for this company. Create a plan from the roadmap first, or disable “Activate for this account”.',
    };
  }
  await prisma.accountPlayActivation.upsert({
    where: {
      roadmapId_playTemplateId: { roadmapId: roadmap.id, playTemplateId },
    },
    create: {
      roadmapId: roadmap.id,
      playTemplateId,
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });
  return { ok: true };
}
