/**
 * Re-create SignalPlayMapping + AccountPlayActivation for the NVIDIA/GM demo user
 * when they were wiped (e.g. after cleanup) but GM + play templates still exist.
 *
 * If templates or GM are missing, run full seed instead:
 *   npm run seed:nvidia-gm
 *
 * Run: npx dotenv -e .env.local -- tsx prisma/repair-demo-signal-mappings.ts
 */

import { PrismaClient, ActionPriority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizeDatabaseUrlForPg } from '@/lib/prisma-connection-string';

const DEMO_EMAIL = 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');
  const normalized = normalizeDatabaseUrlForPg(connectionString);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: normalized }), log: ['error'] });
}

const prisma = createPrisma();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No user ${DEMO_EMAIL}. Sign in once, then run seed:nvidia-gm.`);
    process.exit(1);
  }
  const userId = user.id;

  const slugs = ['executive-intro', 'expansion-cross-sell', 'competitive-displacement'] as const;
  const templates = await prisma.playTemplate.findMany({
    where: { userId, slug: { in: [...slugs] }, status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
  });
  const bySlug = Object.fromEntries(templates.map((t) => [t.slug, t])) as unknown as Record<
    (typeof slugs)[number],
    { id: string; name: string }
  >;

  for (const s of slugs) {
    if (!bySlug[s]) {
      console.error(
        `Missing ACTIVE play template slug "${s}". Your DB has no demo plays — run full seed:\n  npm run seed:nvidia-gm`,
      );
      process.exit(1);
    }
  }

  const gm = await prisma.company.findFirst({
    where: { userId, OR: [{ name: { contains: 'General Motors', mode: 'insensitive' } }, { domain: { contains: 'gm.com', mode: 'insensitive' } }] },
    select: { id: true, name: true },
  });
  if (!gm) {
    console.error('GM company not found. Run full seed:\n  npm run seed:nvidia-gm');
    process.exit(1);
  }

  let roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId, companyId: gm.id },
    select: { id: true },
  });
  if (!roadmap) {
    roadmap = await prisma.adaptiveRoadmap.create({
      data: { userId, companyId: gm.id, roadmapType: 'enterprise_expansion' },
      select: { id: true },
    });
    console.log('Created GM Strategic Account Plan (roadmap).');
  }

  const playTemplateIds = [bySlug['executive-intro'].id, bySlug['expansion-cross-sell'].id, bySlug['competitive-displacement'].id];

  await prisma.signalPlayMapping.deleteMany({
    where: { userId, signalType: { in: ['exec_hire', 'earnings_beat', 'competitor_detected'] } },
  });

  const rows = [
    { signalType: 'exec_hire', playTemplateId: playTemplateIds[0] },
    { signalType: 'earnings_beat', playTemplateId: playTemplateIds[1] },
    { signalType: 'competitor_detected', playTemplateId: playTemplateIds[2] },
  ];
  for (const m of rows) {
    await prisma.signalPlayMapping.create({
      data: {
        userId,
        signalType: m.signalType,
        playTemplateId: m.playTemplateId,
        autoActivate: false,
        priority: ActionPriority.MEDIUM,
      },
    });
  }

  for (const playTemplateId of playTemplateIds) {
    await prisma.accountPlayActivation.upsert({
      where: { roadmapId_playTemplateId: { roadmapId: roadmap.id, playTemplateId } },
      create: { roadmapId: roadmap.id, playTemplateId, isActive: true },
      update: {},
    });
  }

  console.log(`\n✅ Repaired for ${user.email}:`);
  console.log('   SignalPlayMappings: exec_hire, earnings_beat, competitor_detected');
  console.log('   AccountPlayActivations: 3 plays on GM roadmap');
  console.log('\nRun: npm run check:demo-play-mappings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
