/**
 * Seed General Motors with 5 buying groups (departments) and optional catalog products.
 * Run: npx dotenv -e .env.local -- tsx prisma/seed-gm.ts
 */

import { PrismaClient, DepartmentType, DepartmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const GM_BUYING_GROUPS: Array<{
  type: DepartmentType;
  customName: string;
  status: DepartmentStatus;
  estimatedSize: number;
}> = [
  { type: DepartmentType.MANUFACTURING_OPERATIONS, customName: 'Manufacturing', status: DepartmentStatus.EXPANSION_TARGET, estimatedSize: 12000 },
  { type: DepartmentType.INDUSTRIAL_DESIGN, customName: 'Design', status: DepartmentStatus.RESEARCH_PHASE, estimatedSize: 2000 },
  { type: DepartmentType.AUTONOMOUS_VEHICLES, customName: 'Autonomous Vehicles', status: DepartmentStatus.ACTIVE_CUSTOMER, estimatedSize: 3500 },
  { type: DepartmentType.IT_DATA_CENTER, customName: 'IT / Data Center', status: DepartmentStatus.NOT_ENGAGED, estimatedSize: 1500 },
  { type: DepartmentType.SUPPLY_CHAIN, customName: 'Supply Chain', status: DepartmentStatus.NOT_ENGAGED, estimatedSize: 8000 },
];

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    console.error('No user found. Sign in once to create a user, then run this seed.');
    process.exit(1);
  }

  let company = await prisma.company.findFirst({
    where: { userId: user.id, name: { equals: 'General Motors', mode: 'insensitive' } },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'General Motors',
        domain: 'gm.com',
        industry: 'Automotive',
        website: 'https://www.gm.com',
        userId: user.id,
      },
    });
    console.log('Created company: General Motors');
  } else {
    console.log('Using existing company: General Motors');
  }

  for (const g of GM_BUYING_GROUPS) {
    await prisma.companyDepartment.upsert({
      where: {
        companyId_type: { companyId: company.id, type: g.type },
      },
      create: {
        companyId: company.id,
        type: g.type,
        customName: g.customName,
        status: g.status,
        estimatedSize: g.estimatedSize,
      },
      update: {
        customName: g.customName,
        status: g.status,
        estimatedSize: g.estimatedSize,
      },
    });
  }
  console.log('Upserted 5 buying groups (departments) for GM.');

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: company.id },
  });

  const productSlugs = ['jetson', 'omniverse', 'dgx-cloud'];
  const catalogProducts: { id: string; name: string; slug: string }[] = [];

  for (const slug of productSlugs) {
    const name = slug === 'jetson' ? 'Jetson' : slug === 'omniverse' ? 'Omniverse' : 'DGX Cloud';
    const existing = await prisma.catalogProduct.findFirst({ where: { slug } });
    if (existing) {
      catalogProducts.push({ id: existing.id, name: existing.name, slug: existing.slug });
    } else {
      const created = await prisma.catalogProduct.create({
        data: {
          name,
          slug,
          targetDepartments: [],
          targetPersonas: [],
          useCases: [],
          contentTags: [],
          priceMin: 100000,
          priceMax: 500000,
        },
      });
      catalogProducts.push({ id: created.id, name: created.name, slug: created.slug });
    }
  }
  console.log('Catalog products ready:', catalogProducts.map((p) => p.name).join(', '));

  for (const dept of departments) {
    for (const product of catalogProducts) {
      await prisma.companyProduct.upsert({
        where: {
          companyId_companyDepartmentId_productId: {
            companyId: company!.id,
            companyDepartmentId: dept.id,
            productId: product.id,
          },
        },
        create: {
          companyId: company!.id,
          companyDepartmentId: dept.id,
          productId: product.id,
          status: dept.type === DepartmentType.AUTONOMOUS_VEHICLES ? 'ACTIVE' : 'OPPORTUNITY',
          arr: dept.type === DepartmentType.AUTONOMOUS_VEHICLES ? 450000 : null,
          opportunitySize: dept.type === DepartmentType.MANUFACTURING_OPERATIONS ? 300000 : dept.type === DepartmentType.INDUSTRIAL_DESIGN ? 400000 : 200000,
          fitScore: 85,
        },
        update: {},
      });
    }
  }
  console.log('Linked products to departments (matrix data).');

  const manufacturingDept = departments.find((d) => d.type === DepartmentType.MANUFACTURING_OPERATIONS);
  if (manufacturingDept) {
    const existingContact = await prisma.contact.findFirst({
      where: { companyId: company!.id, email: 'michael.torres@gm.com' },
    });
    if (!existingContact) {
      await prisma.contact.create({
        data: {
          companyId: company!.id,
          companyDepartmentId: manufacturingDept.id,
          firstName: 'Michael',
          lastName: 'Torres',
          email: 'michael.torres@gm.com',
          title: 'VP Manufacturing',
        },
      });
      console.log('Added sample contact: Michael Torres (Manufacturing).');
    }
  }

  console.log('Done. Refresh your dashboard to see GM with 5 buying groups and product penetration.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
