/**
 * Central chat model for the app. Use getChatModel() everywhere so we can switch
 * provider via env. Research uses Perplexity for web search; this model is for
 * structuring/synthesis only.
 *
 * Env (priority order):
 * - USE_MOCK_LLM=true → mock model (no API calls)
 * - LLM_PROVIDER=lmstudio → Local LM Studio (OpenAI-compatible, bypasses Gateway)
 * - AI_GATEWAY_API_KEY → Vercel AI Gateway (unified spend tracking for chat + embeddings)
 * - LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY → Claude direct
 * - GOOGLE_GENERATIVE_AI_API_KEY or LLM_PROVIDER=gemini → Gemini direct
 * - else ANTHROPIC_API_KEY → Claude direct
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash';

// ── AI Gateway model IDs (provider-prefixed) ────────────────────────────
const GATEWAY_FULL_MODEL = `anthropic/${ANTHROPIC_MODEL}`;
const GATEWAY_FAST_MODEL = 'anthropic/claude-3-5-haiku-20241022';
const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

/** Content-type hint: route to a specialized model when using AI Gateway. */
export type ContentHint = 'default' | 'visual' | 'web_grounded' | 'long_form';

const GATEWAY_HINT_MODELS: Record<Exclude<ContentHint, 'default'>, string> = {
  visual: 'google/gemini-2.5-flash',
  web_grounded: 'perplexity/sonar',
  long_form: 'google/gemini-2.5-pro',
};

function useGateway(): boolean {
  return (
    !!process.env.AI_GATEWAY_API_KEY &&
    process.env.USE_MOCK_LLM !== 'true' &&
    process.env.LLM_PROVIDER !== 'lmstudio'
  );
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

function getLmStudioModel() {
  const lmstudio = createOpenAI({
    baseURL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
    apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio',
  });
  return lmstudio(process.env.LMSTUDIO_MODEL || 'qwen2.5-coder-32b-instruct');
}

export type ModelTier = 'full' | 'fast' | 'extraction';

const GEMINI_FAST_MODEL = process.env.GEMINI_FAST_MODEL ?? 'gemini-2.0-flash-lite';
const ANTHROPIC_FAST_MODEL = 'claude-3-5-haiku-20241022';

function getGatewayChatModel(
  tier: ModelTier,
  hint?: ContentHint,
  gatewayModel?: string,
) {
  const gw = getGatewayClient();
  if (gatewayModel) {
    return gw(gatewayModel);
  }
  if (hint && hint !== 'default' && GATEWAY_HINT_MODELS[hint]) {
    return gw(GATEWAY_HINT_MODELS[hint]);
  }
  return gw(tier === 'full' ? GATEWAY_FULL_MODEL : GATEWAY_FAST_MODEL);
}

function getFastModel() {
  if (process.env.LLM_PROVIDER === 'lmstudio') {
    return getLmStudioModel();
  }
  if (useGateway()) {
    return getGatewayChatModel('fast');
  }
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
 * Content hint / routing precedence (only applied when AI Gateway is enabled):
 * - explicit `gatewayModel`
 * - then `hint`
 * - then tier default
 *
 * - 'visual': Images, ad briefs, presentation outlines → Google Gemini Flash.
 * - 'web_grounded': Email, LinkedIn InMail → Perplexity Sonar (web search).
 * - 'long_form': Video script, demo script → Google Gemini Pro.
 * - 'default' or omitted: Use tier-based model.
 *
 * Env overrides (priority order):
 * - USE_MOCK_LLM=true → mock model (no API calls)
 * - LLM_PROVIDER=lmstudio → Local LM Studio (OpenAI-compatible, bypasses Gateway)
 * - AI_GATEWAY_API_KEY → Vercel AI Gateway (unified spend tracking; hint applied)
 * - LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY → Claude direct
 * - GOOGLE_GENERATIVE_AI_API_KEY or LLM_PROVIDER=gemini → Gemini direct
 * - else ANTHROPIC_API_KEY → Claude direct
 */
export function getChatModel(
  tier: ModelTier = 'full',
  hint?: ContentHint,
  gatewayModel?: string,
) {
  if (process.env.USE_MOCK_LLM === 'true') {
    return getMockChatModel();
  }

  if (process.env.LLM_PROVIDER === 'lmstudio') {
    return getLmStudioModel();
  }

  const hasGateway = !!process.env.AI_GATEWAY_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.LLM_PROVIDER === 'gemini';
  if (!hasGateway && !hasAnthropic && !hasGoogle) {
    throw new Error(
      'LLM not configured. Set USE_MOCK_LLM=true for mock responses, or set one of: AI_GATEWAY_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY.',
    );
  }

  if (useGateway()) {
    return getGatewayChatModel(tier, hint, gatewayModel);
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
