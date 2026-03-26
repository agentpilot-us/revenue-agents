/**
 * Remove any target company named like "Revenue Vessel" for the official NVIDIA demo user.
 * Use when that legacy account appears in Target Accounts but is not part of the NVIDIA/GM story.
 *
 * Run: npx dotenv -e .env.local -- tsx prisma/remove-revenue-vessel-nvidia-demo.ts
 * Or:  npm run demo:remove-revenue-vessel
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizeDatabaseUrlForPg } from '@/lib/prisma-connection-string';

const OFFICIAL_DEMO_EMAIL = 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }
  const normalized = normalizeDatabaseUrlForPg(connectionString);
  const adapter = new PrismaPg({ connectionString: normalized });
  return new PrismaClient({ adapter, log: ['error', 'warn'] });
}

const prisma = createPrisma();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: OFFICIAL_DEMO_EMAIL },
    select: { id: true, email: true },
  });
  if (!user) {
    console.log(`No user ${OFFICIAL_DEMO_EMAIL}. Nothing to do.`);
    return;
  }

  const before = await prisma.company.findMany({
    where: {
      userId: user.id,
      name: { contains: 'Revenue Vessel', mode: 'insensitive' },
    },
    select: { id: true, name: true },
  });
  if (before.length === 0) {
    console.log('No Revenue Vessel companies found for demo user.');
    return;
  }

  const deleted = await prisma.company.deleteMany({
    where: {
      userId: user.id,
      name: { contains: 'Revenue Vessel', mode: 'insensitive' },
    },
  });
  console.log(
    `Deleted ${deleted.count} company/companies:`,
    before.map((c) => c.name).join(', '),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
