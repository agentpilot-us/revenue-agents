'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { PlayStatus } from '@prisma/client';

export type CreatePlayResult =
  | { ok: true; playId: string }
  | { ok: false; error: string };

/**
 * Create an expansion play for company + department + product.
 * Idempotent: if a play already exists for that triple, returns existing.
 */
export async function createExpansionPlay(
  companyId: string,
  companyDepartmentId: string,
  productId: string,
  opportunitySize?: number
): Promise<CreatePlayResult> {
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

  const existing = await prisma.expansionPlay.findUnique({
    where: {
      companyId_companyDepartmentId_productId: {
        companyId,
        companyDepartmentId,
        productId,
      },
    },
  });
  if (existing) return { ok: true, playId: existing.id };

  const play = await prisma.expansionPlay.create({
    data: {
      companyId,
      companyDepartmentId,
      productId,
      status: PlayStatus.RESEARCH_PHASE,
      weekNumber: 1,
      totalWeeks: 12,
      opportunitySize: opportunitySize != null ? opportunitySize : undefined,
    },
  });
  return { ok: true, playId: play.id };
}
