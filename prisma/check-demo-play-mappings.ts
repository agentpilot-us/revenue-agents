/**
 * Debug: verify SignalPlayMapping + AccountPlayActivation align with PlayTemplates.
 * Run: npx dotenv -e .env.local -- tsx prisma/check-demo-play-mappings.ts
 */

import { PrismaClient } from '@prisma/client';
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
    console.log(`No user ${DEMO_EMAIL}`);
    await prisma.$disconnect();
    return;
  }
  console.log(`User: ${user.email} (${user.id})\n`);

  const mappings = await prisma.signalPlayMapping.findMany({
    where: { userId: user.id },
    include: { playTemplate: { select: { id: true, name: true, slug: true, status: true } } },
    orderBy: { signalType: 'asc' },
  });
  console.log('SignalPlayMappings:', JSON.stringify(mappings, null, 2));

  const activations = await prisma.accountPlayActivation.findMany({
    where: { roadmap: { userId: user.id } },
    include: {
      roadmap: { select: { id: true, companyId: true } },
      playTemplate: { select: { id: true, name: true, slug: true } },
    },
  });
  console.log('\nAccountPlayActivations:', JSON.stringify(activations, null, 2));

  const exec = mappings.find((m) => m.signalType.toLowerCase() === 'exec_hire');
  if (exec?.playTemplate) {
    const ok = exec.playTemplate.status === 'ACTIVE';
    console.log(
      `\nexec_hire → template "${exec.playTemplate.name}" (${exec.playTemplate.slug}) status=${exec.playTemplate.status} ${ok ? '✅' : '❌ INACTIVE mappings are ignored by matchSignalToPlayRun'}`,
    );
  } else {
    console.log('\n❌ No exec_hire mapping — Work This will 404.');
    console.log('\nLikely cause: you ran cleanup:official-demo without re-seeding (cleanup wipes all SignalPlayMappings).');
    console.log('\nFix one of:');
    console.log('  • Full demo:  npm run seed:nvidia-gm');
    console.log('  • Fast repair (if GM + 3 play templates already exist):  npm run repair:demo-signal-mappings');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
