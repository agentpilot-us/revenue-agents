import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import { normalizeDatabaseUrlForPg } from './lib/prisma-connection-string';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Same normalization as lib/db.ts (Neon: uselibpqcompat; others: verify-full)
    url: normalizeDatabaseUrlForPg(env('DATABASE_URL')),
  },
});
