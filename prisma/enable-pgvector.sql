-- Run this once before using db push or migrations that use ContentLibraryChunk (vector type).
-- In Neon: Dashboard → SQL Editor → paste and run.
-- Or: psql $DATABASE_URL -f prisma/enable-pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
