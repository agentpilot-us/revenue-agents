import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_PRISMA_URL must be set');
}

// Normalize SSL mode to avoid pg v9 warnings
// Replace 'sslmode=require' with 'sslmode=verify-full' for current behavior
connectionString = connectionString.replace(/sslmode=require/g, 'sslmode=verify-full');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

