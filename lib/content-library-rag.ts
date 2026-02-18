/**
 * RAG for Content Library: chunk + embed on ingest, similarity search at query time.
 * Uses ContentLibraryChunk (pgvector) and lib/rag-messaging chunkText/embedChunks.
 */
import { embed } from 'ai';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getEmbeddingModel, RAG_EMBEDDING_PROVIDER_OPTIONS } from '@/lib/llm/get-embedding';
import { chunkText, embedChunks } from '@/lib/rag-messaging';

const DEFAULT_TOP_K = 8;

/**
 * Ingest text for a ContentLibrary row: chunk, embed, insert into ContentLibraryChunk.
 * Deletes existing chunks for this contentLibraryId first.
 */
export async function ingestContentLibraryChunks(
  contentLibraryId: string,
  text: string
): Promise<{ chunksCreated: number }> {
  if (!text?.trim()) return { chunksCreated: 0 };

  const chunks = chunkText(text);
  if (chunks.length === 0) return { chunksCreated: 0 };

  const withEmbeddings = await embedChunks(chunks);

  await prisma.contentLibraryChunk.deleteMany({
    where: { contentLibraryId },
  });

  for (let i = 0; i < withEmbeddings.length; i++) {
    const chunk = withEmbeddings[i];
    const vectorStr = '[' + chunk.embedding.join(',') + ']';
    const id = crypto.randomUUID();
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "ContentLibraryChunk" (id, "contentLibraryId", "chunkIndex", content, embedding)
        VALUES (${id}, ${contentLibraryId}, ${i}, ${chunk.text}, ${vectorStr}::vector)
      `
    );
  }

  return { chunksCreated: withEmbeddings.length };
}

/**
 * Retrieve top-k chunks from the user's content library by similarity to the query.
 * Returns chunk content strings for injection into the prompt.
 */
export async function findRelevantContentLibraryChunks(
  userId: string,
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<string[]> {
  if (!query?.trim()) return [];

  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query.replace(/\s+/g, ' ').trim().slice(0, 8000),
    providerOptions: RAG_EMBEDDING_PROVIDER_OPTIONS,
  });
  const vectorStr = '[' + (embedding as number[]).join(',') + ']';

  const rows = await prisma.$queryRaw<{ content: string }[]>`
    SELECT c.content
    FROM "ContentLibraryChunk" c
    INNER JOIN "ContentLibrary" cl ON cl.id = c."contentLibraryId"
    WHERE cl."userId" = ${userId}
      AND cl."isActive" = true
      AND cl."archivedAt" IS NULL
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  return rows.map((r) => r.content);
}

/**
 * Build a "Company content (relevant)" prompt section from RAG chunks.
 * Use when injecting into system prompts for chat or content creation.
 */
export function formatRAGChunksForPrompt(chunks: string[]): string {
  if (chunks.length === 0) return '';
  return `Company content (relevant):\n${chunks.map((c) => `- ${c}`).join('\n')}`;
}
