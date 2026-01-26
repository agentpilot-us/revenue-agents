// Prisma 7 Configuration - Connection URLs for Migrate
// Uses DATABASE_URL (Vercel standard) with fallback to POSTGRES_PRISMA_URL
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file (only in development)
if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(process.cwd(), '.env.local') });
}

// For migrations, use direct URL (non-pooled) if available, otherwise use pooled
const directUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED;
const databaseUrl = directUrl || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_PRISMA_URL must be set');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
    // Note: directUrl is not supported in Prisma 7 prisma.config.ts
    // Use direct URL in the url field if needed for migrations
  },
});
