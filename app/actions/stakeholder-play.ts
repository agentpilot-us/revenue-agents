'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type CreateStakeholderPlayResult =
  | { ok: true; playId: string }
  | { ok: false; error: string };

export async function createStakeholderEngagementPlay(
  companyId: string,
  contactId: string
): Promise<CreateStakeholderPlayResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId },
  });
  if (!contact) return { ok: false, error: 'Contact not found' };

  const existing = await prisma.stakeholderEngagementPlay.findFirst({
    where: { companyId, contactId, status: 'active' },
  });
  if (existing) return { ok: true, playId: existing.id };

  const play = await prisma.stakeholderEngagementPlay.create({
    data: {
      companyId,
      contactId,
      currentStep: 1,
      status: 'active',
    },
  });
  return { ok: true, playId: play.id };
}

export async function updateStakeholderPlayStep(
  playId: string,
  updates: {
    currentStep?: number;
    status?: string;
    researchData?: object;
    draftEmail?: { subject: string; body: string };
    draftEmailApproved?: boolean;
    stepCompletedAt?: Record<string, string>;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const play = await prisma.stakeholderEngagementPlay.findFirst({
    where: { id: playId },
    include: { company: true },
  });
  if (!play || play.company.userId !== session.user.id) return { ok: false, error: 'Play not found' };

  await prisma.stakeholderEngagementPlay.update({
    where: { id: playId },
    data: {
      ...(updates.currentStep != null && { currentStep: updates.currentStep }),
      ...(updates.status != null && { status: updates.status }),
      ...(updates.researchData != null && { researchData: updates.researchData as object }),
      ...(updates.draftEmail != null && { draftEmail: updates.draftEmail as object }),
      ...(updates.draftEmailApproved != null && { draftEmailApproved: updates.draftEmailApproved }),
      ...(updates.stepCompletedAt != null && { stepCompletedAt: updates.stepCompletedAt as object }),
    },
  });
  return { ok: true };
}
