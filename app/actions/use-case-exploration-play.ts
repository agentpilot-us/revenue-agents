'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type CreateUseCaseExplorationPlayResult =
  | { ok: true; playId: string }
  | { ok: false; error: string };

/**
 * Create a Use Case Exploration play for company + department.
 * Redirect to execution at /dashboard/plays/use-case-exploration/[playId].
 */
export async function createUseCaseExplorationPlay(
  companyId: string,
  companyDepartmentId: string,
  _productId?: string
): Promise<CreateUseCaseExplorationPlayResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const department = await prisma.companyDepartment.findFirst({
    where: { id: companyDepartmentId, companyId },
  });
  if (!department) return { ok: false, error: 'Department not found' };

  const play = await prisma.useCaseExplorationPlay.create({
    data: {
      companyId,
      companyDepartmentId,
      currentStep: 1,
      playState: 'waiting_for_user',
      stepState: { '1': 'pending' },
    },
  });
  return { ok: true, playId: play.id };
}

/**
 * Create a Use Case Exploration play for launch-outreach flow with pre-selected contacts.
 * Jumps to step 3 (review/drafts) so user lands on the review page.
 */
export async function createUseCaseExplorationPlayForOutreach(
  companyId: string,
  companyDepartmentId: string,
  contactIds: string[]
): Promise<CreateUseCaseExplorationPlayResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const department = await prisma.companyDepartment.findFirst({
    where: { id: companyDepartmentId, companyId },
  });
  if (!department) return { ok: false, error: 'Department not found' };

  const targetContactIds = contactIds.map((contactId) => ({
    contactId,
    addedAt: new Date().toISOString(),
  }));

  const play = await prisma.useCaseExplorationPlay.create({
    data: {
      companyId,
      companyDepartmentId,
      currentStep: 3,
      playState: 'waiting_for_user',
      stepState: { '1': 'completed', '2': 'completed', '3': 'user_task' },
      stepCompletedAt: { '1': new Date().toISOString(), '2': new Date().toISOString() },
      targetContactIds,
    },
  });
  return { ok: true, playId: play.id };
}
