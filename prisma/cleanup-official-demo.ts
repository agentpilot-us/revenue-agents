/**
 * Remove all data for the official demo account (demo-techinfra@agentpilot.us).
 * Use this before uploading fresh demo data. User record is kept so they can still log in.
 *
 * Run: npx dotenv -e .env.local -- tsx prisma/cleanup-official-demo.ts
 * Or:  npm run cleanup:official-demo
 *
 * Deletes (in order): Companies, then ALL SignalPlayMappings + orphan PlayRuns for the user,
 * then user-scoped ContentLibrary, PlayTemplate, AdaptiveRoadmap, etc.
 * Wiping mappings before templates avoids stale exec_hire → dead templateId after re-seed.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizeDatabaseUrlForPg } from '@/lib/prisma-connection-string';

const OFFICIAL_DEMO_EMAIL = 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/cleanup-official-demo.ts'
    );
  }
  const normalized = normalizeDatabaseUrlForPg(connectionString);
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

const prisma = createPrisma();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: OFFICIAL_DEMO_EMAIL },
    select: { id: true, email: true },
  });

  if (!user) {
    console.log(`No user found with email ${OFFICIAL_DEMO_EMAIL}. Nothing to clean.`);
    await prisma.$disconnect();
    return;
  }

  const userId = user.id;
  console.log(`Cleaning all data for official demo: ${user.email} (${userId})...\n`);

  // 0. Remove product-update signals so they don't clutter My Day after re-seed (cron may recreate from CatalogProducts)
  const productUpdateSignals = await prisma.accountSignal.deleteMany({
    where: { userId, title: { startsWith: 'Product Update:' } },
  });
  if (productUpdateSignals.count > 0) {
    console.log(`Deleted ${productUpdateSignals.count} product-update AccountSignal row(s).`);
  }

  // 1. Delete all companies for this user (cascades roadmaps, contacts, AccountSignals, PlayRuns for those companies, etc.)
  const deletedCompanies = await prisma.company.deleteMany({
    where: { userId },
  });
  console.log(`Deleted ${deletedCompanies.count} company/companies.`);

  // 1b. Orphan PlayRuns (safety) + wipe ALL SignalPlayMappings so re-seed never keeps stale template IDs
  const orphanRuns = await prisma.playRun.deleteMany({ where: { userId } });
  if (orphanRuns.count > 0) console.log(`Deleted ${orphanRuns.count} PlayRun row(s) (user-scoped).`);

  const wipedMappings = await prisma.signalPlayMapping.deleteMany({ where: { userId } });
  console.log(`Deleted ${wipedMappings.count} SignalPlayMapping row(s) (full wipe for demo user).`);

  // 2. User-scoped data (order respects FKs: schedules/imports before ContentLibrary)
  const contentSchedules = await prisma.contentLibrarySchedule.deleteMany({ where: { userId } });
  console.log(`Deleted ${contentSchedules.count} ContentLibrarySchedule rows.`);

  const crawlSchedules = await prisma.contentCrawlSchedule.deleteMany({ where: { userId } });
  console.log(`Deleted ${crawlSchedules.count} ContentCrawlSchedule rows.`);

  const contentImports = await prisma.contentImport.deleteMany({ where: { userId } });
  console.log(`Deleted ${contentImports.count} ContentImport rows.`);

  const contentLib = await prisma.contentLibrary.deleteMany({ where: { userId } });
  console.log(`Deleted ${contentLib.count} ContentLibrary rows.`);

  const productProfiles = await prisma.productProfile.deleteMany({ where: { userId } });
  console.log(`Deleted ${productProfiles.count} ProductProfile rows.`);

  const products = await prisma.product.deleteMany({ where: { userId } });
  console.log(`Deleted ${products.count} Product rows.`);

  const catalogProducts = await prisma.catalogProduct.deleteMany({ where: { userId } });
  console.log(`Deleted ${catalogProducts.count} CatalogProduct rows.`);

  const scheduledActions = await prisma.scheduledAction.deleteMany({ where: { userId } });
  console.log(`Deleted ${scheduledActions.count} ScheduledAction rows.`);

  const industryPlaybooks = await prisma.industryPlaybook.deleteMany({ where: { userId } });
  console.log(`Deleted ${industryPlaybooks.count} IndustryPlaybook rows.`);

  const playTemplates = await prisma.playTemplate.deleteMany({ where: { userId } });
  console.log(`Deleted ${playTemplates.count} PlayTemplate rows.`);

  const adaptiveRoadmaps = await prisma.adaptiveRoadmap.deleteMany({ where: { userId } });
  console.log(`Deleted ${adaptiveRoadmaps.count} AdaptiveRoadmap rows.`);

  const messagingFrameworks = await prisma.messagingFramework.deleteMany({ where: { userId } });
  console.log(`Deleted ${messagingFrameworks.count} MessagingFramework rows.`);

  const segmentCampaigns = await prisma.segmentCampaign.deleteMany({ where: { userId } });
  console.log(`Deleted ${segmentCampaigns.count} SegmentCampaign rows.`);

  const alerts = await prisma.alert.deleteMany({ where: { userId } });
  console.log(`Deleted ${alerts.count} Alert rows.`);

  const salesMapTemplates = await prisma.salesMapTemplate.deleteMany({ where: { userId } });
  console.log(`Deleted ${salesMapTemplates.count} SalesMapTemplate rows.`);

  const sharedBriefings = await prisma.sharedBriefing.deleteMany({ where: { userId } });
  console.log(`Deleted ${sharedBriefings.count} SharedBriefing rows.`);

  const customSignalConfigs = await prisma.customSignalConfig.deleteMany({ where: { userId } });
  console.log(`Deleted ${customSignalConfigs.count} CustomSignalConfig rows.`);

  const accountCampaigns = await prisma.accountCampaign.deleteMany({ where: { userId } });
  console.log(`Deleted ${accountCampaigns.count} AccountCampaign rows.`);

  // PlayGovernance is 1:1 with user
  const gov = await prisma.playGovernance.deleteMany({ where: { userId } });
  if (gov.count > 0) console.log(`Deleted ${gov.count} PlayGovernance row(s).`);

  // Org (user's org for content library etc.)
  const orgs = await prisma.org.deleteMany({ where: { userId } });
  console.log(`Deleted ${orgs.count} Org rows.`);

  // OutreachSequence and related are user-scoped
  const sequences = await prisma.outreachSequence.deleteMany({ where: { userId } });
  console.log(`Deleted ${sequences.count} OutreachSequence rows.`);

  // Activity can have userId (e.g. created by user) - clean any orphaned
  const activities = await prisma.activity.deleteMany({ where: { userId } });
  console.log(`Deleted ${activities.count} Activity rows.`);

  console.log('\nOfficial demo cleanup complete. User can log in; upload new demo data next.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
