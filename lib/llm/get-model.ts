/**
 * Central chat model for the app. Use getChatModel() everywhere so we can switch
 * provider via env. Research uses Perplexity for web search; this model is for
 * structuring/synthesis only.
 *
 * Env (priority order):
 * - USE_MOCK_LLM=true → mock model (no API calls)
 * - LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY → Claude
 * - GOOGLE_GENERATIVE_AI_API_KEY or LLM_PROVIDER=gemini → Gemini
 * - else ANTHROPIC_API_KEY → Claude
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash';

function getMockChatModel() {
  const mockText =
    'This is a mock response. Set USE_MOCK_LLM=false and set GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY for real responses.';
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: mockText }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 0, text: 0, reasoning: undefined },
      },
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-delta', id: '1', delta: mockText },
          {
            type: 'finish',
            finishReason: { unified: 'stop', raw: undefined },
            logprobs: undefined,
            usage: {
              inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 0, text: 0, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

function getGeminiChatModel() {
  return google(GEMINI_CHAT_MODEL);
}

function getAnthropicModel() {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic(ANTHROPIC_MODEL);
}

export type ModelTier = 'full' | 'fast' | 'extraction';

const GEMINI_FAST_MODEL = process.env.GEMINI_FAST_MODEL ?? 'gemini-2.0-flash-lite';
const ANTHROPIC_FAST_MODEL = 'claude-3-5-haiku-20241022';

function getFastModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.LLM_PROVIDER === 'gemini') {
    return google(GEMINI_FAST_MODEL);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic(ANTHROPIC_FAST_MODEL);
  }
  return getGeminiChatModel();
}

/**
 * Returns the chat model for generateText / streamText / generateObject.
 *
 * Tier selection:
 * - 'full' (default): Main model for complex drafting, expansion strategy, research ingest.
 * - 'fast': Cheaper model for simple lookups, structured extraction, signal classification.
 * - 'extraction': Alias for 'fast' — schema-constrained tasks where Haiku-class is sufficient.
 *
 * Env overrides (priority order):
 * - USE_MOCK_LLM=true → mock model (no API calls)
 * - LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY → Claude
 * - GOOGLE_GENERATIVE_AI_API_KEY or LLM_PROVIDER=gemini → Gemini
 * - else ANTHROPIC_API_KEY → Claude
 */
export function getChatModel(tier: ModelTier = 'full') {
  if (process.env.USE_MOCK_LLM === 'true') {
    return getMockChatModel();
  }

  if (tier === 'fast' || tier === 'extraction') {
    return getFastModel();
  }

  if (process.env.LLM_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return getAnthropicModel();
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.LLM_PROVIDER === 'gemini') {
    return getGeminiChatModel();
  }
  return getAnthropicModel();
}
