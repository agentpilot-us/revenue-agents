/**
 * Central chat model for the app. Use getChatModel() everywhere instead of
 * createAnthropic() / anthropic('...') so we can switch to LM Studio or mocks via env.
 *
 * Env:
 * - USE_MOCK_LLM=true → mock model (no API calls; for tests / local dev without credits)
 * - LLM_PROVIDER=lmstudio → LM Studio (or any OpenAI-compatible server) at LM_STUDIO_BASE_URL
 * - else → Anthropic (default)
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

function getMockChatModel() {
  const mockText = 'This is a mock response. Set USE_MOCK_LLM=false and LLM_PROVIDER=lmstudio or use Anthropic for real responses.';
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

function getLMStudioModel() {
  const baseURL = process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1';
  const modelId = process.env.LM_STUDIO_MODEL ?? '';
  const provider = createOpenAICompatible({
    name: 'lmstudio',
    baseURL,
    apiKey: process.env.LM_STUDIO_API_KEY,
  });
  return provider.chatModel(modelId || 'local');
}

function getAnthropicModel() {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic(ANTHROPIC_MODEL);
}

/**
 * Returns the chat model to use for generateText / streamText / generateObject.
 * Respects USE_MOCK_LLM and LLM_PROVIDER (e.g. lmstudio).
 */
export function getChatModel() {
  if (process.env.USE_MOCK_LLM === 'true') {
    return getMockChatModel();
  }
  if (process.env.LLM_PROVIDER === 'lmstudio') {
    return getLMStudioModel();
  }
  return getAnthropicModel();
}
