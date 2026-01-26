// Prisma 7 Configuration - Connection URLs for Migrate
// Uses DATABASE_URL (Vercel standard) with fallback to POSTGRES_PRISMA_URL
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

// For migrations, use direct URL (non-pooled) if available
const directUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED;
const databaseUrl = directUrl || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_PRISMA_URL must be set in .env.local');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
    directUrl: directUrl,
  },
});
