import { embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;
const TOP_K = 8;

export type ChunkWithEmbedding = { text: string; embedding: number[] };

/**
 * Split text into overlapping chunks for embedding.
 */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized.length) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start = end - (end - start > CHUNK_OVERLAP ? CHUNK_OVERLAP : 0);
    if (start >= normalized.length) break;
  }

  return chunks;
}

/**
 * Embed chunks and return { text, embedding }[] for storage.
 */
export async function embedChunks(texts: string[]): Promise<ChunkWithEmbedding[]> {
  if (texts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: texts,
  });

  return texts.map((text, i) => ({
    text,
    embedding: embeddings[i] as number[],
  }));
}

/**
 * Retrieve top-k chunks from a framework by similarity to the query.
 * Chunk storage was removed from schema; returns [] until RAG storage is reintroduced.
 */
export async function retrieveTopChunks(
  _frameworkId: string,
  _query: string,
  _topK: number = TOP_K
): Promise<string[]> {
  return [];
}
