/**
 * Central embedding model for RAG (content library and messaging).
 * Default: Gemini when GOOGLE_GENERATIVE_AI_API_KEY is set (1536 dim to match DB);
 * otherwise OpenAI text-embedding-3-small.
 *
 * Env:
 * - GOOGLE_GENERATIVE_AI_API_KEY (or LLM_PROVIDER=gemini) → Gemini gemini-embedding-001, 1536 dim
 * - else → OpenAI text-embedding-3-small (OPENAI_API_KEY)
 *
 * If you switch provider, re-ingest content so all vectors use the same dimension.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
const RAG_EMBEDDING_DIMENSION = 1536;

function getGeminiEmbeddingModel() {
  return google.embedding(GEMINI_EMBEDDING_MODEL);
}

function getOpenAIEmbeddingModel() {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai.embedding(OPENAI_EMBEDDING_MODEL);
}

/**
 * Returns the embedding model for embed() / embedMany().
 * Gemini when Google key is set; otherwise OpenAI.
 */
export function getEmbeddingModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.LLM_PROVIDER === 'gemini') {
    return getGeminiEmbeddingModel();
  }
  return getOpenAIEmbeddingModel();
}

/**
 * Provider options for RAG embedding calls. Pass to embed() / embedMany() so
 * Gemini uses 1536 dimensions (matches ContentLibraryChunk.embedding vector).
 * Safe to pass when using OpenAI (ignored).
 */
export const RAG_EMBEDDING_PROVIDER_OPTIONS = {
  google: { outputDimensionality: RAG_EMBEDDING_DIMENSION },
} as const;
