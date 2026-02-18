/**
 * Central embedding model for RAG (content library and messaging).
 * When LLM_PROVIDER=lmstudio, uses the same LM Studio server; otherwise OpenAI.
 *
 * Env:
 * - LLM_PROVIDER=lmstudio → LM Studio at LM_STUDIO_BASE_URL, model LM_STUDIO_EMBEDDING_MODEL or LM_STUDIO_MODEL or "local"
 * - else → OpenAI text-embedding-3-small (requires OPENAI_API_KEY)
 *
 * If you switch from OpenAI to LM Studio, existing content library chunks may have a different
 * vector dimension; re-import or re-ingest content so all vectors match.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

function getLMStudioEmbeddingModel() {
  const baseURL = process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1';
  const modelId =
    process.env.LM_STUDIO_EMBEDDING_MODEL ??
    process.env.LM_STUDIO_MODEL ??
    'local';
  const provider = createOpenAICompatible({
    name: 'lmstudio',
    baseURL,
    apiKey: process.env.LM_STUDIO_API_KEY,
  });
  return provider.embeddingModel(modelId);
}

function getOpenAIEmbeddingModel() {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai.embedding(OPENAI_EMBEDDING_MODEL);
}

/**
 * Returns the embedding model for embed() / embedMany().
 * Uses LM Studio when LLM_PROVIDER=lmstudio, otherwise OpenAI.
 */
export function getEmbeddingModel() {
  if (process.env.LLM_PROVIDER === 'lmstudio') {
    return getLMStudioEmbeddingModel();
  }
  return getOpenAIEmbeddingModel();
}
