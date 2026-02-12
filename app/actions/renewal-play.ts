'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type CreateRenewalPlayResult =
  | { ok: true; playId: string }
  | { ok: false; error: string };

export async function createRenewalPlay(
  companyId: string,
  renewalDate: Date
): Promise<CreateRenewalPlayResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const existing = await prisma.renewalPlay.findFirst({
    where: { companyId, status: 'active' },
  });
  if (existing) return { ok: true, playId: existing.id };

  const play = await prisma.renewalPlay.create({
    data: {
      companyId,
      renewalDate,
      currentStep: 1,
      status: 'active',
    },
  });
  return { ok: true, playId: play.id };
}
