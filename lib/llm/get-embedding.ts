/**
 * Central embedding model for RAG (content library and messaging).
 *
 * When AI_GATEWAY_API_KEY is set: routes through Vercel AI Gateway so embedding
 * token spend appears alongside chat spend in the same dashboard.
 *
 * Otherwise: uses Google Gemini (gemini-embedding-001) directly.
 *
 * Both paths produce 1536-dimensional vectors to match the
 * ContentLibraryChunk.embedding vector column.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

type EmbeddingProviderOptions =
  NonNullable<Parameters<(typeof import('ai'))['embed']>[0]['providerOptions']>;

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
const RAG_EMBEDDING_DIMENSION = 1536;

const GATEWAY_EMBEDDING_MODEL = 'google/text-embedding-005';
const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

function useGateway(): boolean {
  return !!process.env.AI_GATEWAY_API_KEY;
}

let _gatewayClient: ReturnType<typeof createOpenAI> | null = null;
function getGatewayClient() {
  if (!_gatewayClient) {
    _gatewayClient = createOpenAI({
      baseURL: GATEWAY_BASE_URL,
      apiKey: process.env.AI_GATEWAY_API_KEY!,
    });
  }
  return _gatewayClient;
}

export function getEmbeddingModel() {
  if (useGateway()) {
    const gw = getGatewayClient();
    return gw.embedding(GATEWAY_EMBEDDING_MODEL);
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY is required for embeddings (or set AI_GATEWAY_API_KEY to use AI Gateway). Set it in your .env.local file.'
    );
  }
  return google.embedding(GEMINI_EMBEDDING_MODEL);
}

export function getEmbeddingProviderOptions(): EmbeddingProviderOptions {
  if (useGateway()) return {};
  return { google: { outputDimensionality: RAG_EMBEDDING_DIMENSION } };
}
