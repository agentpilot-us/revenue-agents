# AI Gateway Evaluation: Pros, Cons & Implementation Plan

Reference: [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)

---

## Current State

- **Single abstraction**: All chat flows through `lib/llm/get-model.ts` → `getChatModel(tier)` (full / fast / extraction).
- **Embeddings**: `lib/llm/get-embedding.ts` → Google `gemini-embedding-001` only.
- **Providers today**: Anthropic (Claude), Google (Gemini), optional LM Studio (local). Env-driven: `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.
- **Stack**: AI SDK v6, `generateText` / `streamText` / `useChat` — compatible with [AI Gateway + AI SDK](https://vercel.com/docs/ai-gateway/getting-started).

---

## Pros of Using AI Gateway

| Benefit | Why it matters for revenue-agents |
|--------|-----------------------------------|
| **One key, many models** | One `AI_GATEWAY_API_KEY` instead of managing Anthropic + Google (and future providers) separately. Simpler env and secrets. |
| **Unified API** | [Single endpoint](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions) (`https://ai-gateway.vercel.sh/v1`) for chat. Swap models (e.g. `anthropic/claude-sonnet-4.6` vs `xai/grok-4.1-fast-reasoning`) with a string change. |
| **Usage & spend tracking** | [Spend monitoring](https://vercel.com/docs/ai-gateway/capabilities/usage) and [observability](https://vercel.com/docs/ai-gateway/capabilities/observability) in one place. Critical for variable-cost features (research, content gen, signals). |
| **Reliability & fallbacks** | [Retries and fallbacks](https://vercel.com/docs/ai-gateway/models-and-providers/provider-options) if a provider fails. Fewer “provider down” user errors. |
| **No markup (including BYOK)** | [Zero markup on tokens](https://vercel.com/docs/ai-gateway/authentication-and-byok/byok); [BYOK](https://vercel.com/docs/ai-gateway/authentication-and-byok/byok) keeps your own keys. Cost stays predictable. |
| **Fits existing abstraction** | You already route everything through `getChatModel()`. Gateway can sit behind that; call sites stay unchanged. |
| **Embeddings** | Gateway supports [embeddings](https://vercel.com/docs/ai-gateway); you could later route `getEmbeddingModel()` through it for one usage view (chat + embeddings). |

---

## Cons / Risks

| Drawback | Mitigation |
|----------|------------|
| **Vendor tie-in** | Gateway is Vercel-specific. If you leave Vercel, you must revert to direct provider clients. | Keep `get-model.ts` as a thin adapter so switching back is “swap implementation, not 50 call sites.” |
| **Local dev (LM Studio)** | Gateway is a remote API. Local LM Studio won’t go through it. | Keep `LLM_PROVIDER=lmstudio` path as today: direct OpenAI-compatible client to `localhost`. |
| **Latency** | One extra hop (your server → Vercel → provider). Usually small. | Use Gateway in prod; optional in dev, or accept minor dev latency. |
| **BYOK / key handling** | If you use BYOK, keys still live in your env; Gateway just routes. | Same security as today; document who manages which key. |
| **Model IDs** | Gateway uses provider-prefixed IDs (e.g. `anthropic/claude-sonnet-4.6`). | Map your internal tier names to Gateway model strings in one place. |
| **Feature parity** | New provider features (e.g. new params) may appear in Gateway with a delay. | Check [models and providers](https://vercel.com/docs/ai-gateway/models-and-providers) when adopting new features. |

---

## Implementation Plan

### Phase 1: Add Gateway as an optional path (no breaking changes)

1. **Env**
   - Add `AI_GATEWAY_API_KEY` (optional).
   - If set, use Gateway for Anthropic/Google; if not set, keep current direct provider behavior.

2. **`lib/llm/get-model.ts`**
   - When `AI_GATEWAY_API_KEY` is set and provider is not `lmstudio`:
     - Use a single OpenAI-compatible client pointing at `baseURL: 'https://ai-gateway.vercel.sh/v1'` and `apiKey: process.env.AI_GATEWAY_API_KEY`.
     - Map tiers to Gateway model IDs, e.g.:
       - full → `anthropic/claude-sonnet-4-20250514` (or Gateway’s alias)
       - fast / extraction → `anthropic/claude-3-5-haiku-20241022` or `google/gemini-2.0-flash-lite`.
   - Keep existing logic for `USE_MOCK_LLM`, `LLM_PROVIDER=lmstudio`, and fallbacks when Gateway key is unset.
   - Ref: [OpenAI compatibility](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions), [Getting started](https://vercel.com/docs/ai-gateway/getting-started).

3. **No call-site changes**
   - All existing `getChatModel()`, `getChatModel('fast')`, etc. keep working; only the implementation behind them changes when Gateway is enabled.

### Phase 2: Observability and usage

1. **Vercel project**
   - Enable [AI Gateway](https://vercel.com/docs/ai-gateway) on the project (permissions, usage dashboard).
2. **Tagging (optional)**
   - If Gateway supports request metadata (e.g. project/app name), use a consistent tag (e.g. `revenue-agents`) so usage is easy to filter.
3. **Budgets**
   - Set [budgets](https://vercel.com/docs/ai-gateway/capabilities/usage) in the dashboard once baseline usage is visible.

### Phase 3: Embeddings (optional)

1. **`lib/llm/get-embedding.ts`**
   - If Gateway supports your embedding model (e.g. Google embeddings), add a branch: when `AI_GATEWAY_API_KEY` is set, call Gateway for embeddings instead of Google directly.
   - Keeps a single place for “all AI usage” in Vercel’s view.

### Phase 4: Fallbacks and tuning

1. **Fallbacks**
   - Use [provider options](https://vercel.com/docs/ai-gateway/models-and-providers/provider-options) (e.g. primary Anthropic, fallback to Gemini) for critical paths (e.g. research, content generation) if useful.
2. **Model updates**
   - Periodically align your model IDs with [Gateway’s models list](https://vercel.com/docs/ai-gateway/models-and-providers) and upgrade (e.g. newer Claude/Gemini) in one place.

---

## Summary

- **Pros**: One key, one place for usage/spend, better reliability, no extra token cost, fits your current `getChatModel()` design.
- **Cons**: Tied to Vercel; LM Studio stays direct; small latency and model-ID mapping.
- **Plan**: Add Gateway as an optional path behind `get-model.ts` (and optionally embeddings), keep LM Studio and existing env behavior, then turn on observability and budgets. No need to change call sites.

---

## Implemented

Gateway support was added as an opt-in path. Set `AI_GATEWAY_API_KEY` in your environment to enable.

### What changed

| File | Change |
|------|--------|
| `lib/llm/get-model.ts` | Added Gateway branch: when `AI_GATEWAY_API_KEY` is set and not mock/lmstudio, uses `createOpenAI` with `https://ai-gateway.vercel.sh/v1`. Tier map: **full** → `anthropic/claude-sonnet-4-20250514`, **fast/extraction** → `anthropic/claude-3-5-haiku-20241022`. |
| `lib/llm/get-embedding.ts` | Added Gateway branch: when `AI_GATEWAY_API_KEY` is set, uses `google/text-embedding-005` via Gateway with 1536 dimensions. Otherwise falls back to direct Google `gemini-embedding-001`. Replaced `RAG_EMBEDDING_PROVIDER_OPTIONS` const with `getEmbeddingProviderOptions()` function for correct runtime evaluation. |
| `lib/rag-messaging.ts` | Updated to use `getEmbeddingProviderOptions()`. |
| `lib/content-library-rag.ts` | Updated to use `getEmbeddingProviderOptions()`. |
| `.env.example` / `.env.local.example` | Documented `AI_GATEWAY_API_KEY` (optional). |

### Precedence (chat)

1. `USE_MOCK_LLM=true` → mock (no API calls, no Gateway)
2. `LLM_PROVIDER=lmstudio` → LM Studio direct (no Gateway)
3. `AI_GATEWAY_API_KEY` set → Vercel AI Gateway
4. Else → direct Anthropic / Gemini via existing env vars

### Precedence (embeddings)

1. `AI_GATEWAY_API_KEY` set → Gateway (`google/text-embedding-005`, 1536 dims)
2. Else → direct Google `gemini-embedding-001` (requires `GOOGLE_GENERATIVE_AI_API_KEY`)

### Viewing spend

Once `AI_GATEWAY_API_KEY` is active, all chat and embedding token usage appears in the [Vercel AI Gateway usage dashboard](https://vercel.com/docs/ai-gateway/capabilities/usage) for the project.
