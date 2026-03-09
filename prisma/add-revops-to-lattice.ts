/**
 * Add the missing RevOps department to Lattice (Celigo demo).
 * Run: npx dotenv -e .env.local -- tsx prisma/add-revops-to-lattice.ts
 */

import { DepartmentType, DepartmentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

const REVOPS = {
  type: DepartmentType.REVENUE_OPERATIONS,
  customName: 'RevOps',
  useCase:
    'Quote-to-cash automation and lead lifecycle management — connecting Salesforce, billing, and NetSuite to eliminate manual reconciliation and revenue leakage.',
  valueProp:
    "Celigo eliminates the manual handoffs in Lattice's quote-to-cash motion. Salesforce CPQ to billing to NetSuite — automated, accurate, real-time. Your team gets full pipeline visibility without the spreadsheet reconciliation every quarter close.",
  targetRoles: ['VP of Revenue Operations', 'Director of RevOps', 'Senior RevOps Manager', 'Head of Sales Operations'],
  segmentType: 'primary',
};

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: 'Lattice HQ', mode: 'insensitive' } },
        { domain: { equals: 'lattice.com', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
  });

  if (!company) {
    console.log('No company named "Lattice HQ" or with domain lattice.com found.');
    process.exit(1);
  }

  const existing = await prisma.companyDepartment.findFirst({
    where: { companyId: company.id, type: REVOPS.type },
  });

  if (existing) {
    console.log(`RevOps already exists for ${company.name} (id: ${existing.id}).`);
    return;
  }

  const targetRolesJson = {
    economicBuyer: REVOPS.targetRoles,
    technicalEvaluator: [] as string[],
    champion: [] as string[],
    influencer: [] as string[],
  } as Prisma.InputJsonValue;

  const dept = await prisma.companyDepartment.create({
    data: {
      companyId: company.id,
      type: REVOPS.type,
      customName: REVOPS.customName,
      status: DepartmentStatus.RESEARCH_PHASE,
      useCase: REVOPS.useCase,
      valueProp: REVOPS.valueProp,
      targetRoles: targetRolesJson,
      segmentType: REVOPS.segmentType,
    },
  });

  console.log(`Added RevOps department to ${company.name} (id: ${dept.id}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
