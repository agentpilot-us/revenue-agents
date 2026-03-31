/**
 * Execute a PlayAction: create Activity, ContactTouch, mark action executed,
 * optionally advance phase gate and next phase.
 */

import { prisma } from '@/lib/db';
import { getOutboundProvider } from '@/lib/email';
import { clearPlayRunAtRiskOnProgress } from '@/lib/plays/clear-play-run-at-risk';

export type ExecutePlayActionInput = {
  actionId: string;
  userId: string;
  /** Optional: use this content instead of action's edited/generated (e.g. final copy sent). */
  subject?: string | null;
  body?: string | null;
  /** Optional: resolve Contact for Activity.contactId and lastEmailSentAt update. */
  contactId?: string | null;
};

export type ExecutePlayActionResult = {
  ok: boolean;
  activityId?: string;
  contactTouchId?: string;
  error?: string;
};

function actionTypeToTouchChannel(actionType: string): 'EMAIL' | 'LINKEDIN' | 'CALL' | 'MEETING' | 'SLACK' | 'OTHER' {
  switch (actionType) {
    case 'SEND_EMAIL':
      return 'EMAIL';
    case 'SEND_LINKEDIN':
      return 'LINKEDIN';
    case 'SCHEDULE_MEETING':
    case 'MAKE_CALL':
      return actionType === 'SCHEDULE_MEETING' ? 'MEETING' : 'CALL';
    default:
      return 'OTHER';
  }
}

function getContentBody(content: string | Record<string, unknown> | null | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const r = content as Record<string, unknown>;
  return (r.body as string) ?? (r.raw as string) ?? '';
}

function getContentSubject(content: string | Record<string, unknown> | null | undefined): string | undefined {
  if (!content || typeof content === 'string') return undefined;
  return (content as Record<string, unknown>).subject as string | undefined;
}

export async function executePlayAction(input: ExecutePlayActionInput): Promise<ExecutePlayActionResult> {
  const { actionId, userId, subject: overrideSubject, body: overrideBody, contactId: inputContactId } = input;

  const action = await prisma.playAction.findFirst({
    where: { id: actionId },
    include: {
      phaseRun: {
        include: {
          playRun: {
            include: {
              company: { select: { id: true, name: true } },
              playTemplate: { select: { name: true } },
            },
          },
          phaseTemplate: { select: { name: true } },
        },
      },
    },
  });

  if (!action) throw new Error('PlayAction not found');
  if (action.phaseRun.playRun.userId !== userId) throw new Error('Unauthorized');

  const run = action.phaseRun.playRun;
  const companyId = run.companyId;
  const playName = run.playTemplate.name;
  const phaseName = action.phaseRun.phaseTemplate.name;

  const content = action.editedContent ?? action.generatedContent;
  const body = overrideBody ?? getContentBody(content);
  const subject = overrideSubject ?? action.editedSubject ?? action.generatedSubject ?? getContentSubject(content);

  const touchChannel = actionTypeToTouchChannel(action.actionType);
  const contactName = action.contactName ?? 'Unknown';
  const contactEmail = action.contactEmail ?? undefined;

  let contactId: string | null = inputContactId ?? action.contactId ?? null;
  if (!contactId && contactEmail) {
    const contact = await prisma.contact.findFirst({
      where: { companyId, email: contactEmail },
      select: { id: true },
    });
    contactId = contact?.id ?? null;
  }

  if (action.actionType === 'SEND_EMAIL' && contactEmail && (body || overrideBody)) {
    const provider = await getOutboundProvider(userId);
    const html = (body || '').replace(/\n/g, '<br/>');
    const result = await provider.send({
      to: contactEmail,
      subject: subject ?? 'Follow-up from AgentPilot',
      html,
      text: body || '',
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
  }

  const activityType =
    action.actionType === 'SEND_EMAIL'
      ? 'EMAIL_SENT'
      : action.actionType === 'SEND_LINKEDIN'
        ? 'LINKEDIN_DRAFTED'
        : action.actionType === 'SCHEDULE_MEETING' || action.actionType === 'MAKE_CALL'
          ? 'MEETING_SCHEDULED'
          : 'Research';

  const activity = await prisma.activity.create({
    data: {
      type: activityType,
      summary: subject
        ? `Sent: ${subject}`
        : `${action.title} — ${run.company.name}`,
      content: body || undefined,
      subject: subject ?? undefined,
      body: body || undefined,
      companyId,
      contactId: contactId ?? undefined,
      userId,
      agentUsed: 'play_run',
      metadata: { playActionId: actionId, playRunId: run.id } as import('@prisma/client').Prisma.InputJsonValue,
    },
  });

  const contactTouch = await prisma.contactTouch.create({
    data: {
      companyId,
      contactName,
      contactEmail: contactEmail ?? undefined,
      contactTitle: action.contactTitle ?? undefined,
      playActionId: actionId,
      playRunId: run.id,
      playName,
      phaseName,
      channel: touchChannel,
      subject: subject ?? undefined,
    },
  });

  await prisma.playAction.update({
    where: { id: actionId },
    data: {
      status: 'EXECUTED',
      executedAt: new Date(),
    },
  });

  if (contactId) {
    await prisma.contact
      .update({
        where: { id: contactId },
        data: {
          lastContactedAt: new Date(),
          lastContactMethod: action.actionType === 'SEND_EMAIL' ? 'email' : 'other',
          ...(action.actionType === 'SEND_EMAIL'
            ? { lastEmailSentAt: new Date(), totalEmailsSent: { increment: 1 } }
            : {}),
        },
      })
      .catch(() => {});
  }

  const contentTemplateId = action.contentTemplateId;
  if (contentTemplateId) {
    const template = await prisma.contentTemplate
      .findUnique({ where: { id: contentTemplateId }, select: { timesSent: true, avgEditDistance: true } })
      .catch(() => null);
    const nextTimesSent = (template?.timesSent ?? 0) + 1;
    const editRatio =
      body || overrideBody
        ? (action.editedContent != null && action.editedContent !== action.generatedContent) ||
            (action.editedSubject != null && action.editedSubject !== action.generatedSubject)
          ? 1
          : 0
        : 0;
    const oldAvg = template?.avgEditDistance ?? null;
    const newAvg =
      nextTimesSent === 1
        ? editRatio
        : oldAvg != null
          ? (oldAvg * (nextTimesSent - 1) + editRatio) / nextTimesSent
          : editRatio;
    await prisma.contentTemplate
      .update({
        where: { id: contentTemplateId },
        data: {
          timesSent: { increment: 1 },
          avgEditDistance: newAvg,
        },
      })
      .catch(() => {});
  }

  await checkPhaseGateAndAdvance(action.phaseRunId, run.id, userId);

  await clearPlayRunAtRiskOnProgress(run.id);

  return {
    ok: true,
    activityId: activity.id,
    contactTouchId: contactTouch.id,
  };
}

/** Gate types that should not auto-advance from action completion. */
const GATE_TYPES_NO_AUTO_ADVANCE = ['MANUAL', 'CRM_FIELD'] as const;

/**
 * Complete a phase run and advance to the next phase (and recurse for AUTO gates).
 * Used by CONTENT_SENT after all actions done, by MANUAL via "Complete Phase" endpoint, and by CRM cron for CRM_FIELD.
 */
export async function completePhaseAndAdvance(
  phaseRunId: string,
  playRunId: string,
  userId: string,
): Promise<void> {
  const phaseRun = await prisma.playPhaseRun.findUnique({
    where: { id: phaseRunId },
    include: {
      playRun: {
        select: { userId: true, currentPhaseIdx: true },
        include: {
          playTemplate: {
            include: {
              phases: { orderBy: { orderIndex: 'asc' }, select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!phaseRun || phaseRun.playRun.userId !== userId) return;

  await prisma.playPhaseRun.update({
    where: { id: phaseRunId },
    data: {
      gateCompleted: true,
      gateCompletedAt: new Date(),
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  const run = phaseRun.playRun;
  const phases = run.playTemplate.phases;
  const currentIdx = run.currentPhaseIdx;
  const nextIdx = currentIdx + 1;

  if (nextIdx >= phases.length) {
    await prisma.playRun.update({
      where: { id: playRunId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return;
  }

  const nextPhaseId = phases[nextIdx].id;
  await prisma.playRun.update({
    where: { id: playRunId },
    data: { currentPhaseIdx: nextIdx },
  });

  const nextPhaseRun = await prisma.playPhaseRun.findFirst({
    where: { playRunId, phaseTemplateId: nextPhaseId },
    include: { phaseTemplate: { select: { gateType: true } } },
  });
  if (!nextPhaseRun) return;

  await prisma.playPhaseRun.update({
    where: { id: nextPhaseRun.id },
    data: { status: 'ACTIVE', activatedAt: new Date() },
  });

  // AUTO gate: advance immediately with no actions required
  if (nextPhaseRun.phaseTemplate.gateType === 'AUTO') {
    await completePhaseAndAdvance(nextPhaseRun.id, playRunId, userId);
  }
}

/**
 * After an action is executed: only advance phase when gate is CONTENT_SENT and all actions are done.
 * MANUAL and CRM_FIELD do not auto-advance; MANUAL uses "Complete Phase" button, CRM_FIELD uses cron.
 */
async function checkPhaseGateAndAdvance(phaseRunId: string, playRunId: string, userId: string) {
  const phaseRun = await prisma.playPhaseRun.findUnique({
    where: { id: phaseRunId },
    include: {
      actions: { select: { status: true } },
      phaseTemplate: { select: { gateType: true } },
      playRun: { select: { currentPhaseIdx: true }, include: { playTemplate: { include: { phases: { orderBy: { orderIndex: 'asc' }, select: { id: true } } } } } },
    },
  });
  if (!phaseRun) return;

  const allDone = phaseRun.actions.every(
    (a) => a.status === 'EXECUTED' || a.status === 'SKIPPED',
  );
  if (!allDone) return;

  const gateType = phaseRun.phaseTemplate.gateType;
  if (GATE_TYPES_NO_AUTO_ADVANCE.includes(gateType as (typeof GATE_TYPES_NO_AUTO_ADVANCE)[number])) {
    return; // MANUAL: user clicks "Complete Phase". CRM_FIELD: cron evaluates.
  }
  if (gateType !== 'CONTENT_SENT') {
    return; // AUTO is handled when phase is activated, not here
  }

  await completePhaseAndAdvance(phaseRunId, playRunId, userId);
}
