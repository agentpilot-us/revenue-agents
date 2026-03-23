/**
 * Set all companies for the official demo user (demo-techinfra@agentpilot.us) to live mode:
 * isDemoAccount = false so the demo uses real content and API/LLM calls.
 *
 * Run: npx dotenv -e .env.local -- tsx prisma/set-official-demo-live.ts
 * Or:  npm run official-demo:set-live
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizeDatabaseUrlForPg } from '@/lib/prisma-connection-string';

const OFFICIAL_DEMO_EMAIL = 'demo-techinfra@agentpilot.us';

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Use: dotenv -e .env.local -- tsx prisma/set-official-demo-live.ts'
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
    console.log(`No user found with email ${OFFICIAL_DEMO_EMAIL}. Nothing to update.`);
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.company.updateMany({
    where: { userId: user.id },
    data: {
      isDemoAccount: false,
      demoLockedAt: null,
      demoVertical: null,
      demoNote: null,
    },
  });

  console.log(
    `Set isDemoAccount = false for ${result.count} company/companies (${user.email}). Demo is now live.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
