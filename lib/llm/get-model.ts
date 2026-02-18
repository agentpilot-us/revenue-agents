/**
 * Central chat model for the app. Use getChatModel() everywhere so we can switch
 * provider via env. Default: Gemini when GOOGLE_GENERATIVE_AI_API_KEY is set;
 * otherwise Anthropic. Mock available for tests.
 *
 * Env:
 * - USE_MOCK_LLM=true → mock model (no API calls)
 * - GOOGLE_GENERATIVE_AI_API_KEY → Gemini (default for chat; recommended for low cost / token limits)
 * - else ANTHROPIC_API_KEY → Anthropic (fallback for teams that prefer it)
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
 * Uses Gemini when GOOGLE_GENERATIVE_AI_API_KEY (or LLM_PROVIDER=gemini) is set; otherwise Anthropic.
 */
export function getChatModel() {
  if (process.env.USE_MOCK_LLM === 'true') {
    return getMockChatModel();
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.LLM_PROVIDER === 'gemini') {
    return getGeminiChatModel();
  }
  return getAnthropicModel();
}
