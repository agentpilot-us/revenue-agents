/**
 * Shared constants for account signals (Exa + Perplexity pipeline).
 * Use these when mapping relevanceScore to tiers or filtering in the UI.
 */

/** Minimum relevance score to persist from the fetcher (stored in DB). */
export const RELEVANCE_PERSIST_MIN = 5;

/** Minimum relevance score for Hot Signals on the dashboard (status = new). */
export const RELEVANCE_HOT_SIGNALS_MIN = 7;

/** Tier 1: high-impact (e.g. earnings, exec hire) — score >= this. */
export const RELEVANCE_TIER_1_MIN = 8;

/** Tier 2: strategic — score >= this and < TIER_1. */
export const RELEVANCE_TIER_2_MIN = 6;

/** Signal types that we dedupe across cron runs (same type within window = skip new). */
export const TYPE_DEDUP_DAYS: Record<string, number> = {
  earnings_call: 7,
  acquisition: 7,
};
