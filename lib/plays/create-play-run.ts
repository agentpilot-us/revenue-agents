/**
 * Creates a PlayRun from a PlayTemplate: one PlayPhaseRun per phase,
 * one PlayAction per ContentTemplate in each phase. No content generation —
 * just the record structure. Used by signal path, catalog "Run on account", and chat.
 */

import { addDays } from 'date-fns';
import { AutonomyLevel } from '@prisma/client';
import { prisma } from '@/lib/db';
import { parseAutonomyLevel } from './autonomy';
import { completePhaseAndAdvance } from './execute-action';
import { ensureTemplateRolesForPlayTemplate } from './ensure-template-roles';
import {
  autoPopulatePlayRunContacts,
  resolveActionStatusForNewStep,
} from './play-run-roster';
import { DEMO_PRE_SEEDED_CONTENT, UPSELL_DEMO_PRE_SEEDED_CONTENT } from './pre-seeded-demo-content';

export type { AutonomyLevel };

export type CreatePlayRunInput = {
  userId: string;
  companyId: string;
  playTemplateId: string;
  /** Optional: for TIMELINE plays, resolved anchor (e.g. contract end date). */
  anchorDate?: Date | null;
  /** Optional: primary contact for actions (name, email, title). */
  targetContact?: { name: string; email?: string | null; title?: string | null } | null;
  /** Optional: durable link when contact exists on this company (validated in create). */
  targetContactId?: string | null;
  /** Optional: link to the signal that triggered this run. */
  accountSignalId?: string | null;
  /** Optional: custom title override for the run. */
  title?: string | null;
  /** Optional: scope run to a division/buying group (RoadmapTarget id). */
  roadmapTargetId?: string | null;
  /** Optional: division when no roadmap target row (must belong to company). */
  targetCompanyDepartmentId?: string | null;
  /** Optional: product this run is positioning. */
  productId?: string | null;
  /** Optional: how the run was triggered. Default MANUAL. */
  triggerType?: 'MANUAL' | 'SIGNAL' | 'OBJECTIVE' | 'TIMER';
  /** Optional: signal summary, objective text, or timer reason. */
  triggerContext?: Record<string, unknown> | null;
  /** Optional: override autonomy. If not set, resolved from activation → template default → DRAFT_REVIEW. */
  autonomyLevel?: AutonomyLevel | string | null;
};

/** Map ContentTemplate.contentType to PlayAction.actionType. */
function contentTypeToActionType(
  contentType: string
): 'SEND_EMAIL' | 'SEND_LINKEDIN' | 'REVIEW_BRIEF' | 'REVIEW_DECK' | 'INTERNAL_ALIGN' {
  switch (contentType) {
    case 'EMAIL':
      return 'SEND_EMAIL';
    case 'LINKEDIN_MSG':
      return 'SEND_LINKEDIN';
    case 'DECK':
    case 'EBR_DECK':
      return 'REVIEW_DECK';
    case 'BRIEF':
    case 'PROPOSAL':
    case 'BATTLE_CARD':
    case 'CHAMPION_ENABLEMENT':
    case 'INTERNAL_NOTE':
    case 'SLACK_MSG':
    default:
      return 'REVIEW_BRIEF';
  }
}

/**
 * Apply pre-seeded demo content to actions whose title matches the 7-step play.
 * Only writes when generatedContent is null (never overwrites AI-generated content).
 * Call at end of createPlayRunFromTemplate so Work This / Start from Catalog runs get content.
 */
export async function applyPreSeededContent(playRunId: string): Promise<number> {
  const run = await prisma.playRun.findUnique({
    where: { id: playRunId },
    include: { playTemplate: { select: { slug: true } } },
  });
  const contentMap =
    run?.playTemplate?.slug === 'expansion-dgx-to-drive-thor'
      ? UPSELL_DEMO_PRE_SEEDED_CONTENT
      : DEMO_PRE_SEEDED_CONTENT;

  const actions = await prisma.playAction.findMany({
    where: { phaseRun: { playRunId } },
    select: { id: true, title: true, generatedContent: true },
    orderBy: { createdAt: 'asc' },
  });

  let count = 0;
  for (const action of actions) {
    if (action.generatedContent) continue;

    const titleLower = (action.title ?? '').toLowerCase();
    const matched = Object.entries(contentMap).find(
      ([key]) => titleLower.startsWith(key) || titleLower.includes(key),
    );

    if (matched) {
      const [, content] = matched;
      await prisma.playAction.update({
        where: { id: action.id },
        data: {
          generatedSubject: content.subject ?? null,
          generatedContent: content.body,
          generatedAt: new Date(),
        },
      });
      count++;
    }
  }

  return count;
}

export async function createPlayRunFromTemplate(input: CreatePlayRunInput) {
  const {
    userId,
    companyId,
    playTemplateId,
    anchorDate,
    targetContact,
    targetContactId,
    accountSignalId,
    roadmapTargetId,
    targetCompanyDepartmentId: inputTargetDeptId,
    productId,
    triggerType = 'MANUAL',
    triggerContext,
    autonomyLevel: inputAutonomy,
  } = input;

  await prisma.$transaction(async (tx) => {
    await ensureTemplateRolesForPlayTemplate(tx, playTemplateId);
  });

  const template = await prisma.playTemplate.findFirst({
    where: { id: playTemplateId, userId },
    include: {
      templateRoles: { orderBy: { orderIndex: 'asc' } },
      phases: {
        orderBy: { orderIndex: 'asc' },
        include: { contentTemplates: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });

  if (!template) {
    throw new Error('PlayTemplate not found');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true, name: true },
  });
  if (!company) {
    throw new Error('Company not found');
  }

  let validatedRoadmapTargetId: string | null = null;
  if (roadmapTargetId) {
    const rt = await prisma.roadmapTarget.findFirst({
      where: {
        id: roadmapTargetId,
        roadmap: { userId, companyId },
      },
      select: { id: true },
    });
    if (rt) validatedRoadmapTargetId = rt.id;
  }

  let validatedTargetCompanyDepartmentId: string | null = null;
  if (inputTargetDeptId) {
    const dept = await prisma.companyDepartment.findFirst({
      where: { id: inputTargetDeptId, companyId },
      select: { id: true },
    });
    if (dept) validatedTargetCompanyDepartmentId = dept.id;
  }

  let validatedTargetContactId: string | null = null;
  if (targetContactId) {
    const contactRow = await prisma.contact.findFirst({
      where: { id: targetContactId, companyId },
      select: { id: true },
    });
    if (contactRow) validatedTargetContactId = contactRow.id;
  }

  const parsedInput =
    inputAutonomy == null
      ? null
      : typeof inputAutonomy === 'string'
        ? parseAutonomyLevel(inputAutonomy)
        : inputAutonomy;

  let autonomyLevel: AutonomyLevel =
    parsedInput ?? template.defaultAutonomyLevel ?? AutonomyLevel.DRAFT_REVIEW;

  if (parsedInput == null) {
    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { userId, companyId },
      select: { id: true },
    });
    if (roadmap) {
      const activation = await prisma.accountPlayActivation.findUnique({
        where: {
          roadmapId_playTemplateId: { roadmapId: roadmap.id, playTemplateId: template.id },
        },
        select: { customConfig: true },
      });
      const level = (activation?.customConfig as Record<string, unknown>)?.autonomyLevel;
      const fromActivation = parseAutonomyLevel(level);
      if (fromActivation != null) {
        autonomyLevel = fromActivation;
      }
    }
  }

  const playRunData = {
    playTemplateId: template.id,
    companyId,
    userId,
    ...(accountSignalId != null && { accountSignalId }),
    ...(validatedRoadmapTargetId != null && { roadmapTargetId: validatedRoadmapTargetId }),
    ...(validatedTargetCompanyDepartmentId != null && {
      targetCompanyDepartmentId: validatedTargetCompanyDepartmentId,
    }),
    ...(productId != null && { productId }),
    triggerType: (triggerType ?? 'MANUAL') as 'MANUAL' | 'SIGNAL' | 'OBJECTIVE' | 'TIMER',
    ...(triggerContext != null && { triggerContext }),
    status: 'ACTIVE' as const,
    autonomyLevel,
    anchorDate: anchorDate ?? undefined,
    currentPhaseIdx: 0,
  };
  const playRun = await prisma.playRun.create({
    data: playRunData as Parameters<typeof prisma.playRun.create>[0]['data'],
  });

  const templateRoles = template.templateRoles;
  const primaryTemplateRole =
    templateRoles.find((r) => r.key === 'primary') ?? templateRoles[0];
  if (!primaryTemplateRole) {
    throw new Error('PlayTemplate has no roles');
  }

  for (const tr of templateRoles) {
    await prisma.playRunContact.create({
      data: {
        playRunId: playRun.id,
        playTemplateRoleId: tr.id,
        status: 'UNASSIGNED',
      },
    });
  }

  const primaryRoster = await prisma.playRunContact.findUnique({
    where: {
      playRunId_playTemplateRoleId: {
        playRunId: playRun.id,
        playTemplateRoleId: primaryTemplateRole.id,
      },
    },
  });

  if (validatedTargetContactId && primaryRoster) {
    await prisma.playRunContact.update({
      where: { id: primaryRoster.id },
      data: {
        contactId: validatedTargetContactId,
        status: 'CONFIRMED',
      },
    });
  }

  await autoPopulatePlayRunContacts(playRun.id);

  const rosterSlots = await prisma.playRunContact.findMany({
    where: { playRunId: playRun.id },
    include: {
      contact: true,
      playTemplateRole: true,
    },
  });
  const rosterByRoleId = new Map(rosterSlots.map((s) => [s.playTemplateRoleId, s]));

  const now = new Date();

  for (let i = 0; i < template.phases.length; i++) {
    const phase = template.phases[i];
    const targetDate =
      anchorDate != null && phase.offsetDays != null
        ? addDays(anchorDate, phase.offsetDays)
        : undefined;

    const phaseRun = await prisma.playPhaseRun.create({
      data: {
        playRunId: playRun.id,
        phaseTemplateId: phase.id,
        status: i === 0 ? 'ACTIVE' : 'NOT_STARTED',
        targetDate: targetDate ?? undefined,
        activatedAt: i === 0 ? now : undefined,
      },
    });
    for (const content of phase.contentTemplates) {
      const actionType = contentTypeToActionType(content.contentType);
      const role =
        templateRoles.find((r) => r.id === content.playTemplateRoleId) ?? primaryTemplateRole;
      const slot = rosterByRoleId.get(role.id);
      const c = slot?.contact;
      const hasContact = !!c?.id;
      const status = resolveActionStatusForNewStep(content, role, hasContact);

      const contactName = c
        ? [c.firstName, c.lastName].filter(Boolean).join(' ') || undefined
        : targetContact?.name ?? undefined;
      const actionTitle =
        contactName ? `${content.name} — ${contactName}`
        : targetContact?.name ? `${content.name} — ${targetContact.name}`
        : content.name;

      await prisma.playAction.create({
        data: {
          phaseRunId: phaseRun.id,
          contentTemplateId: content.id,
          title: actionTitle,
          actionType,
          priority: 'MEDIUM',
          status,
          playTemplateRoleId: role.id,
          targetRoleKey: role.key,
          contactName,
          contactEmail: c?.email ?? targetContact?.email ?? undefined,
          contactTitle: c?.title ?? targetContact?.title ?? undefined,
          contactRole: role.mapToContactRole ?? undefined,
          ...(c?.id ? { contactId: c.id } : {}),
          suggestedDate: targetDate ?? undefined,
          dueDate: targetDate ?? undefined,
        },
      });
    }
  }

  // Pre-seed demo content on New C-Suite Executive steps (only when generatedContent is null; never overwrites AI output)
  const seeded = await applyPreSeededContent(playRun.id);
  if (seeded > 0) {
    // Optional: log in dev; avoid noisy logs in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`Pre-seeded ${seeded} actions with demo content`);
    }
  }

  const runWithPhases = await prisma.playRun.findUnique({
    where: { id: playRun.id },
    include: {
      phaseRuns: {
        include: {
          phaseTemplate: { select: { name: true, orderIndex: true } },
          actions: {
            include: { contentTemplate: { select: { name: true, contentType: true } } },
          },
        },
      },
      playTemplate: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  if (!runWithPhases) throw new Error('PlayRun not found after create');

  runWithPhases.phaseRuns.sort(
    (a, b) => a.phaseTemplate.orderIndex - b.phaseTemplate.orderIndex
  );

  // AUTO gate on first phase: advance immediately with no actions required
  const firstPhase = template.phases[0];
  if (firstPhase?.gateType === 'AUTO' && runWithPhases.phaseRuns[0]) {
    await completePhaseAndAdvance(
      runWithPhases.phaseRuns[0].id,
      playRun.id,
      userId,
    );
    // Refetch so caller gets updated phase indices / status
    const updated = await prisma.playRun.findUnique({
      where: { id: playRun.id },
      include: {
        phaseRuns: {
          include: {
            phaseTemplate: { select: { name: true, orderIndex: true } },
            actions: {
              include: { contentTemplate: { select: { name: true, contentType: true } } },
            },
          },
        },
        playTemplate: { select: { name: true } },
        company: { select: { name: true } },
      },
    });
    if (updated) {
      updated.phaseRuns.sort(
        (a, b) => a.phaseTemplate.orderIndex - b.phaseTemplate.orderIndex
      );
      return updated;
    }
  }

  return runWithPhases;
}
