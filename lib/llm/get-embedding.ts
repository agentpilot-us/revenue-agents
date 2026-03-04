/**
 * Central embedding model for RAG (content library and messaging).
 * Uses Google Gemini (gemini-embedding-001) at 1536 dimensions to match
 * the ContentLibraryChunk.embedding vector column.
 *
 * Requires GOOGLE_GENERATIVE_AI_API_KEY.
 */
import { google } from '@ai-sdk/google';

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
const RAG_EMBEDDING_DIMENSION = 1536;

export function getEmbeddingModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY is required for embeddings. Set it in your .env.local file.'
    );
  }
  return google.embedding(GEMINI_EMBEDDING_MODEL);
}

export const RAG_EMBEDDING_PROVIDER_OPTIONS = {
  google: { outputDimensionality: RAG_EMBEDDING_DIMENSION },
} as const;
