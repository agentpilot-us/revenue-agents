/**
 * Remove all demo data created by seed-demo-agentpilot.ts.
 * Run: npm run cleanup:demo   or   npx dotenv -e .env.local -- tsx prisma/cleanup-demo.ts
 *
 * Deletes: SegmentCampaign (demo-enterprise), Company (Enterprise Demo),
 *          ContentLibrary (NVIDIA, Revenue Vessel, Global Infrastructure Summit),
 *          ProductProfile (AgentPilot Platform for demo user), Product (AgentPilot), CatalogProduct (agentpilot-platform).
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/cleanup-demo.ts');
  }
  const normalized = connectionString
    .replace(/sslmode=require\b/g, 'sslmode=verify-full')
    .replace(/sslmode=prefer\b/g, 'sslmode=verify-full')
    .replace(/sslmode=verify-ca\b/g, 'sslmode=verify-full');
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

const prisma = createPrisma();

const DEMO_SLUG = 'demo-enterprise';
const DEMO_COMPANY_NAME = 'Enterprise Demo';
const DEMO_PRODUCT_NAME = 'AgentPilot';
const DEMO_CATALOG_SLUG = 'agentpilot-platform';
const DEMO_CONTENT_TITLES = ['NVIDIA', 'Revenue Vessel', 'Global Infrastructure Summit'];

async function main() {
  // Resolve demo user via Company (same as seed: demo belongs to first user / whoever has Enterprise Demo)
  const company = await prisma.company.findFirst({
    where: { name: DEMO_COMPANY_NAME },
    select: { id: true, userId: true },
  });

  if (!company) {
    console.log('No "Enterprise Demo" company found. Demo data may already be removed.');
    // Still try to remove orphaned demo content by product/catalog/slug
    await deleteDemoContentBySlugAndCatalog();
    await prisma.$disconnect();
    return;
  }

  const userId = company.userId;
  console.log('Removing demo data for user (company:', company.id, ')...');

  // 1. SegmentCampaign (demo-enterprise)
  const campaign = await prisma.segmentCampaign.findFirst({
    where: { userId, slug: DEMO_SLUG },
    select: { id: true },
  });
  if (campaign) {
    await prisma.segmentCampaign.delete({ where: { id: campaign.id } });
    console.log('Deleted SegmentCampaign:', DEMO_SLUG);
  }

  // 2. Company (Enterprise Demo)
  await prisma.company.delete({ where: { id: company.id } });
  console.log('Deleted Company:', DEMO_COMPANY_NAME);

  // 3. ContentLibrary: NVIDIA, Revenue Vessel, Global Infrastructure Summit (for this user)
  const contentToDelete = await prisma.contentLibrary.findMany({
    where: {
      userId,
      OR: DEMO_CONTENT_TITLES.map((t) => ({ title: { contains: t } })),
    },
    select: { id: true, title: true },
  });
  for (const row of contentToDelete) {
    await prisma.contentLibrary.delete({ where: { id: row.id } });
    console.log('Deleted ContentLibrary:', row.title);
  }

  // 4. ProductProfile for AgentPilot Platform (catalog slug) and this user
  const catalog = await prisma.catalogProduct.findUnique({
    where: { slug: DEMO_CATALOG_SLUG },
    select: { id: true },
  });
  if (catalog) {
    await prisma.productProfile.deleteMany({
      where: { userId, catalogProductId: catalog.id },
    });
    console.log('Deleted ProductProfile(s) for AgentPilot Platform');
  }

  // 5. Product (AgentPilot) for this user
  const product = await prisma.product.findFirst({
    where: { userId, name: DEMO_PRODUCT_NAME },
    select: { id: true },
  });
  if (product) {
    await prisma.product.delete({ where: { id: product.id } });
    console.log('Deleted Product:', DEMO_PRODUCT_NAME);
  }

  // 6. CatalogProduct (agentpilot-platform)
  if (catalog) {
    await prisma.catalogProduct.delete({ where: { id: catalog.id } });
    console.log('Deleted CatalogProduct:', DEMO_CATALOG_SLUG);
  }

  console.log('\nDemo data cleanup complete.');
}

/** If company was already deleted, still clean campaign by slug and catalog/product by identifiers */
async function deleteDemoContentBySlugAndCatalog() {
  const campaign = await prisma.segmentCampaign.findFirst({
    where: { slug: DEMO_SLUG },
    select: { id: true },
  });
  if (campaign) {
    await prisma.segmentCampaign.delete({ where: { id: campaign.id } });
    console.log('Deleted SegmentCampaign:', DEMO_SLUG);
  }

  // ContentLibrary by demo titles (any user)
  for (const title of DEMO_CONTENT_TITLES) {
    const deleted = await prisma.contentLibrary.deleteMany({
      where: { title: { contains: title } },
    });
    if (deleted.count > 0) console.log('Deleted ContentLibrary (title contains):', title);
  }

  const catalog = await prisma.catalogProduct.findUnique({
    where: { slug: DEMO_CATALOG_SLUG },
    select: { id: true },
  });
  if (catalog) {
    await prisma.productProfile.deleteMany({ where: { catalogProductId: catalog.id } });
    const products = await prisma.product.findMany({
      where: { name: DEMO_PRODUCT_NAME },
      select: { id: true },
    });
    for (const p of products) {
      await prisma.contentLibrary.deleteMany({ where: { productId: p.id } });
      await prisma.product.delete({ where: { id: p.id } });
    }
    await prisma.catalogProduct.delete({ where: { id: catalog.id } });
    console.log('Deleted CatalogProduct and related ProductProfile/Product for', DEMO_CATALOG_SLUG);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
