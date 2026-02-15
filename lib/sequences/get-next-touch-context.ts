import { prisma } from '@/lib/db';
import { EnrollmentStatus, SequenceChannel } from '@prisma/client';

export type NextTouchStep = {
  order: number;
  dayOffset: number;
  channel: SequenceChannel;
  role: string;
  promptTemplate: string | null;
  ctaType: string | null;
};

export type NextTouchContext = {
  enrollmentId: string;
  sequenceId: string;
  sequenceName: string;
  contactId: string;
  currentStepIndex: number;
  step: NextTouchStep;
  suggestedChannel: string;
  promptContext: string;
};

/**
 * Load the contact's active enrollment and return context for the next step (draft or advance).
 * Returns null if contact has no active enrollment or next touch is not due.
 */
export async function getNextTouchContext(
  contactId: string,
  userId: string
): Promise<NextTouchContext | null> {
  const enrollment = await prisma.contactSequenceEnrollment.findFirst({
    where: {
      contactId,
      userId,
      status: EnrollmentStatus.active,
    },
    include: {
      sequence: {
        include: {
          steps: { orderBy: { order: 'asc' } },
        },
      },
      contact: { select: { id: true } },
    },
  });

  if (!enrollment || !enrollment.sequence.steps.length) return null;

  const steps = enrollment.sequence.steps;
  const currentStepIndex = enrollment.currentStepIndex;
  if (currentStepIndex >= steps.length) return null;

  const step = steps[currentStepIndex];
  const now = new Date();
  const due = enrollment.nextTouchDueAt ? enrollment.nextTouchDueAt <= now : true;
  if (!due) return null;

  const promptParts: string[] = [];
  if (step.role) promptParts.push(`Step role: ${step.role}`);
  if (step.ctaType) promptParts.push(`CTA type: ${step.ctaType}`);
  if (step.promptTemplate) promptParts.push(step.promptTemplate);

  return {
    enrollmentId: enrollment.id,
    sequenceId: enrollment.sequenceId,
    sequenceName: enrollment.sequence.name,
    contactId: enrollment.contactId,
    currentStepIndex,
    step: {
      order: step.order,
      dayOffset: step.dayOffset,
      channel: step.channel,
      role: step.role,
      promptTemplate: step.promptTemplate,
      ctaType: step.ctaType,
    },
    suggestedChannel: step.channel,
    promptContext: promptParts.join('\n'),
  };
}

/** Lightweight context for chat: current enrollment state for a contact (for experimental_context). */
export type ActiveEnrollmentContext = {
  enrollmentId: string;
  sequenceName: string;
  currentStepIndex: number;
  stepRole: string;
  ctaType: string | null;
};

/**
 * Get active enrollment summary for a contact (for passing to chat context).
 * Returns the first active enrollment with current step info.
 */
export async function getActiveEnrollmentContext(
  contactId: string,
  userId: string
): Promise<ActiveEnrollmentContext | null> {
  const enrollment = await prisma.contactSequenceEnrollment.findFirst({
    where: {
      contactId,
      userId,
      status: EnrollmentStatus.active,
    },
    include: {
      sequence: { select: { name: true } },
    },
  });
  if (!enrollment) return null;

  const steps = await prisma.outreachSequenceStep.findMany({
    where: { sequenceId: enrollment.sequenceId },
    orderBy: { order: 'asc' },
  });
  const step = steps[enrollment.currentStepIndex];
  if (!step) return null;

  return {
    enrollmentId: enrollment.id,
    sequenceName: enrollment.sequence.name,
    currentStepIndex: enrollment.currentStepIndex,
    stepRole: step.role,
    ctaType: step.ctaType,
  };
}

/**
 * Advance enrollment after a touch was sent: increment step, set nextTouchDueAt or completedAt.
 */
export async function advanceEnrollment(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.contactSequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { sequence: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });
  if (!enrollment) return;

  const steps = enrollment.sequence.steps;
  const nextIndex = enrollment.currentStepIndex + 1;

  if (nextIndex >= steps.length) {
    await prisma.contactSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.completed,
        completedAt: new Date(),
        currentStepIndex: nextIndex,
        nextTouchDueAt: null,
        updatedAt: new Date(),
      },
    });
    return;
  }

  const nextStep = steps[nextIndex];
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + nextStep.dayOffset);

  await prisma.contactSequenceEnrollment.update({
    where: { id: enrollmentId },
    data: {
      currentStepIndex: nextIndex,
      nextTouchDueAt: nextDue,
      updatedAt: new Date(),
    },
  });
}
