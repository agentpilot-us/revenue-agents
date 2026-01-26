// Prisma 7 Configuration - Connection URLs for Migrate
// Uses DATABASE_URL (Vercel standard) with fallback to POSTGRES_PRISMA_URL
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
    directUrl: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED,
  },
});
