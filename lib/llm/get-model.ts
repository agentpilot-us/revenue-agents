/**
 * Central chat model for the app. Use getChatModel() everywhere so we can switch
 * provider via env. Research uses Perplexity for web search; this model is for
 * structuring/synthesis only (no OpenAI here).
 *
 * Env (priority order):
 * - USE_MOCK_LLM=true → mock model (no API calls)
 * - LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY → Claude
 * - GOOGLE_GENERATIVE_AI_API_KEY or LLM_PROVIDER=gemini → Gemini (avoids OpenAI quota)
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

/**
 * Returns the chat model for generateText / streamText / generateObject.
 * - USE_MOCK_LLM=true → mock
 * - LLM_PROVIDER=anthropic (and ANTHROPIC_API_KEY set) → Claude (use this to avoid Gemini quota)
 * - GOOGLE_GENERATIVE_AI_API_KEY or LLM_PROVIDER=gemini → Gemini
 * - else ANTHROPIC_API_KEY → Claude
 */
export function getChatModel() {
  if (process.env.USE_MOCK_LLM === 'true') {
    return getMockChatModel();
  }
  if (process.env.LLM_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return getAnthropicModel();
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.LLM_PROVIDER === 'gemini') {
    return getGeminiChatModel();
  }
  return getAnthropicModel();
}
