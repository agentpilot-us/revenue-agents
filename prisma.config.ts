// Prisma 7 Configuration
// Database connection URLs (separated from schema in Prisma 7)

import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local file
config({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.POSTGRES_PRISMA_URL,      // Pooled connection for queries
  },
});
