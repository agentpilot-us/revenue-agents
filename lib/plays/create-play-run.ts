/**
 * Creates a PlayRun from a PlayTemplate: one PlayPhaseRun per phase,
 * one PlayAction per ContentTemplate in each phase. No content generation —
 * just the record structure. Used by signal path, catalog "Run on account", and chat.
 */

import { addDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { completePhaseAndAdvance } from './execute-action';

export type CreatePlayRunInput = {
  userId: string;
  companyId: string;
  playTemplateId: string;
  /** Optional: for TIMELINE plays, resolved anchor (e.g. contract end date). */
  anchorDate?: Date | null;
  /** Optional: primary contact for actions (name, email, title). */
  targetContact?: { name: string; email?: string | null; title?: string | null } | null;
  /** Optional: link to the signal that triggered this run. */
  accountSignalId?: string | null;
  /** Optional: custom title override for the run. */
  title?: string | null;
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

export async function createPlayRunFromTemplate(input: CreatePlayRunInput) {
  const { userId, companyId, playTemplateId, anchorDate, targetContact, accountSignalId } = input;

  const template = await prisma.playTemplate.findFirst({
    where: { id: playTemplateId, userId },
    include: {
      phases: { orderBy: { orderIndex: 'asc' }, include: { contentTemplates: true } },
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

  const playRun = await prisma.playRun.create({
    data: {
      playTemplateId: template.id,
      companyId,
      userId,
      accountSignalId: accountSignalId ?? undefined,
      status: 'ACTIVE',
      anchorDate: anchorDate ?? undefined,
      currentPhaseIdx: 0,
    },
  });

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
      const actionTitle = targetContact?.name
        ? `${content.name} — ${targetContact.name}`
        : content.name;

      await prisma.playAction.create({
        data: {
          phaseRunId: phaseRun.id,
          contentTemplateId: content.id,
          title: actionTitle,
          actionType,
          priority: 'MEDIUM',
          status: 'PENDING',
          contactName: targetContact?.name ?? undefined,
          contactEmail: targetContact?.email ?? undefined,
          contactTitle: targetContact?.title ?? undefined,
          suggestedDate: targetDate ?? undefined,
          dueDate: targetDate ?? undefined,
        },
      });
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
