/**
 * Generate renewal-approaching signals for CompanyProducts whose
 * contractRenewalDate is within 90, 60, or 30 days from now.
 *
 * Dedup: skips if a renewal_approaching signal already exists for the
 * same company + product within the last 7 days.
 */

import { prisma } from '@/lib/db';

const RENEWAL_WINDOWS = [
  { days: 30, relevanceScore: 9 },
  { days: 60, relevanceScore: 7 },
  { days: 90, relevanceScore: 5 },
] as const;

const DEDUP_DAYS = 7;

export async function generateRenewalSignals(userId: string): Promise<number> {
  const now = new Date();
  const maxWindow = new Date();
  maxWindow.setDate(maxWindow.getDate() + 90);

  const companyProducts = await prisma.companyProduct.findMany({
    where: {
      contractRenewalDate: { gte: now, lte: maxWindow },
      company: { userId },
    },
    include: {
      company: { select: { id: true, name: true, userId: true } },
      product: { select: { id: true, name: true } },
    },
  });

  const dedupSince = new Date();
  dedupSince.setDate(dedupSince.getDate() - DEDUP_DAYS);

  let created = 0;

  for (const cp of companyProducts) {
    if (!cp.contractRenewalDate) continue;

    const daysUntilRenewal = Math.ceil(
      (cp.contractRenewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const window = RENEWAL_WINDOWS.find((w) => daysUntilRenewal <= w.days);
    if (!window) continue;

    const existing = await prisma.accountSignal.findFirst({
      where: {
        companyId: cp.companyId,
        type: 'renewal_approaching',
        url: { contains: cp.productId },
        createdAt: { gte: dedupSince },
      },
    });
    if (existing) continue;

    const renewalDateStr = cp.contractRenewalDate.toISOString().split('T')[0];

    await prisma.accountSignal.create({
      data: {
        companyId: cp.companyId,
        userId: cp.company.userId,
        type: 'renewal_approaching',
        title: `${cp.product.name} renewal in ${daysUntilRenewal} days at ${cp.company.name}`,
        summary: `Contract renewal date: ${renewalDateStr}. This is an opportunity to discuss expansion or upsell.`,
        url: `internal://renewal/${cp.companyId}/${cp.productId}`,
        publishedAt: now,
        relevanceScore: window.relevanceScore,
        suggestedPlay: 're_engagement',
        status: 'new',
      },
    });
    created++;
  }

  return created;
}
