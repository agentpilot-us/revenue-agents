/**
 * Enroll a contact in an outreach sequence.
 *
 * Used by the plan execution workflow to auto-enroll contacts
 * in follow-up sequences after the initial outreach.
 */

import { prisma } from '@/lib/db';
import { EnrollmentStatus } from '@prisma/client';

export type EnrollContactParams = {
  contactId: string;
  sequenceId: string;
  userId: string;
};

export type EnrollContactResult =
  | { ok: true; enrollmentId: string; isNew: boolean }
  | { ok: false; error: string };

export async function enrollContactInSequence(
  params: EnrollContactParams
): Promise<EnrollContactResult> {
  const { contactId, sequenceId, userId } = params;

  // Check for existing enrollment
  const existing = await prisma.contactSequenceEnrollment.findUnique({
    where: { contactId_sequenceId: { contactId, sequenceId } },
  });

  if (existing) {
    if (existing.status === EnrollmentStatus.active) {
      return { ok: true, enrollmentId: existing.id, isNew: false };
    }
    // Re-enroll if completed or paused
    const steps = await prisma.outreachSequenceStep.findMany({
      where: { sequenceId },
      orderBy: { order: 'asc' },
    });

    const firstStep = steps[0];
    const nextDue = new Date();
    if (firstStep) {
      nextDue.setDate(nextDue.getDate() + firstStep.dayOffset);
    }

    await prisma.contactSequenceEnrollment.update({
      where: { id: existing.id },
      data: {
        status: EnrollmentStatus.active,
        currentStepIndex: 0,
        nextTouchDueAt: nextDue,
        completedAt: null,
      },
    });
    return { ok: true, enrollmentId: existing.id, isNew: false };
  }

  // New enrollment
  const sequence = await prisma.outreachSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!sequence) {
    return { ok: false, error: `Sequence not found: ${sequenceId}` };
  }

  const firstStep = sequence.steps[0];
  const nextDue = new Date();
  if (firstStep) {
    nextDue.setDate(nextDue.getDate() + firstStep.dayOffset);
  }

  const enrollment = await prisma.contactSequenceEnrollment.create({
    data: {
      contactId,
      sequenceId,
      userId,
      status: EnrollmentStatus.active,
      currentStepIndex: 0,
      nextTouchDueAt: nextDue,
    },
  });

  return { ok: true, enrollmentId: enrollment.id, isNew: true };
}

/**
 * Find the user's default sequence (or first sequence).
 * Used when the plan doesn't specify a sequence.
 */
export async function getDefaultSequenceId(userId: string): Promise<string | null> {
  const defaultSeq = await prisma.outreachSequence.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (defaultSeq) return defaultSeq.id;

  const firstSeq = await prisma.outreachSequence.findFirst({
    where: { userId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return firstSeq?.id ?? null;
}
