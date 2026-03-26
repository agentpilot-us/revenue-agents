/**
 * Persist validated account research to Company (top-level fields + researchData JSON).
 * Does not sync CompanyDepartment rows — use apply-research for full segment materialization.
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type { CompanyResearchData } from '@/lib/research/company-research-schema';

export async function persistCompanyResearchSnapshot(
  companyId: string,
  researchData: CompanyResearchData,
  rawBody: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: researchData.companyName,
      website: researchData.website ?? undefined,
      industry: researchData.industry ?? undefined,
      employees: researchData.employees ?? undefined,
      headquarters: researchData.headquarters ?? undefined,
      revenue: researchData.revenue ?? undefined,
      businessOverview: researchData.businessOverview,
      keyInitiatives: researchData.keyInitiatives,
      segmentationStrategy: researchData.segmentationStrategy ?? undefined,
      segmentationRationale: researchData.segmentationRationale ?? undefined,
      researchData: rawBody,
      accountResearchRefreshedAt: new Date(),
    },
  });
}
