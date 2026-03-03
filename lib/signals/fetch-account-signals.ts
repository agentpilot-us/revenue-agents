/**
 * Fetch realtime account signals via Exa (news, financial, executive) and classify with one LLM call per company.
 * When Exa's publishedDate is missing we use cron run time so signals still surface in the 48h dashboard window.
 *
 * Cost optimization: hashes sorted Exa result URLs and compares to previous run's hash.
 * If results are identical (no new news), skips the LLM classification call entirely.
 */

import { createHash } from 'crypto';
import Exa from 'exa-js';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getChatModel } from '@/lib/llm/get-model';
import { RELEVANCE_PERSIST_MIN } from './constants';

const exa = process.env.EXA_API_KEY ? new Exa(process.env.EXA_API_KEY) : null;

export type SignalType =
  | 'earnings_call'
  | 'product_announcement'
  | 'executive_hire'
  | 'executive_departure'
  | 'funding_round'
  | 'acquisition'
  | 'industry_news'
  | 'job_posting_signal';

export type SuggestedPlay =
  | 'new_buying_group'
  | 'event_invite'
  | 'feature_release'
  | 're_engagement'
  | 'champion_enablement'
  | 'none';

export type AccountSignal = {
  type: SignalType;
  title: string;
  summary: string;
  url: string;
  publishedAt: string; // ISO date string
  relevanceScore: number;
  suggestedPlay?: SuggestedPlay;
  customSignalName?: string;
};

export type CustomExaQuery = {
  configName: string;
  query: string;
  numResults?: number;
};

type ExaResult = {
  title: string | null;
  url: string;
  publishedDate?: string;
  text?: string;
  summary?: { content?: string } | string;
};

function normalizeExaResults(response: { results?: ExaResult[] }): ExaResult[] {
  const results = response.results ?? [];
  return results.filter((r) => r?.url);
}

function hashExaUrls(results: ExaResult[]): string {
  const sorted = results.map((r) => r.url).sort();
  return createHash('sha256').update(sorted.join('|')).digest('hex');
}

export type PreFetchedResult = {
  url: string;
  title: string;
  text?: string;
  publishedDate?: string;
};

export type FetchSignalsResult = {
  signals: AccountSignal[];
  urlHash: string;
  skippedLlm: boolean;
};

/**
 * One LLM call per company: classify all Exa results in a single generateObject.
 * Only return signals with relevanceScore >= RELEVANCE_PERSIST_MIN (stored in DB; dashboard filters >= 7).
 *
 * Pass previousUrlHash to skip the LLM call when Exa returns the same set of results.
 * When skipped, returns { signals: previousSignals, urlHash, skippedLlm: true }.
 */
export async function fetchAccountSignals(
  companyName: string,
  companyDomain: string,
  industry: string | null,
  lookbackHours: number = 48,
  previousUrlHash?: string | null,
  previousSignals?: AccountSignal[],
  customQueries?: CustomExaQuery[]
): Promise<FetchSignalsResult> {
  if (!exa) {
    return { signals: [], urlHash: '', skippedLlm: true };
  }

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  // Run 3 standard Exa searches in parallel
  const [newsRes, financialRes, execRes] = await Promise.all([
    exa.search(
      `${companyName} ${industry ?? ''} announcement news product launch`.trim(),
      {
        numResults: 10,
        startPublishedDate: sinceStr,
        category: 'news',
        contents: { text: { maxCharacters: 500 } },
      }
    ),
    exa.search(
      `${companyName} earnings quarterly results SEC filing`.trim(),
      {
        numResults: 5,
        startPublishedDate: sinceStr,
        category: 'financial report',
        contents: { text: { maxCharacters: 500 } },
      }
    ),
    exa.search(
      `${companyName} chief vice president director hired appointed joined departed`.trim(),
      {
        numResults: 5,
        startPublishedDate: sinceStr,
        category: 'news',
        contents: { text: { maxCharacters: 500 } },
      }
    ),
  ]);

  const allResults: ExaResult[] = [
    ...normalizeExaResults(newsRes as { results?: ExaResult[] }),
    ...normalizeExaResults(financialRes as { results?: ExaResult[] }),
    ...normalizeExaResults(execRes as { results?: ExaResult[] }),
  ].filter((r) => r.url && (r.title || r.url));

  // Run custom Exa queries and track which results came from which config
  const customResultMap = new Map<string, ExaResult[]>();
  if (customQueries?.length) {
    const customResults = await Promise.all(
      customQueries.map(async (cq) => {
        try {
          const res = await exa!.search(cq.query, {
            numResults: cq.numResults ?? 5,
            startPublishedDate: sinceStr,
            contents: { text: { maxCharacters: 500 } },
          });
          return { name: cq.configName, results: normalizeExaResults(res as { results?: ExaResult[] }) };
        } catch {
          return { name: cq.configName, results: [] as ExaResult[] };
        }
      })
    );
    for (const cr of customResults) {
      const filtered = cr.results.filter((r) => r.url && (r.title || r.url));
      if (filtered.length > 0) {
        customResultMap.set(cr.name, filtered);
        allResults.push(...filtered);
      }
    }
  }

  // Build a set of custom URLs for tagging after LLM classification
  const customUrlToName = new Map<string, string>();
  for (const [name, results] of customResultMap) {
    for (const r of results) {
      customUrlToName.set(r.url, name);
    }
  }

  if (allResults.length === 0) return { signals: [], urlHash: '', skippedLlm: true };

  const currentUrlHash = hashExaUrls(allResults);

  if (previousUrlHash && currentUrlHash === previousUrlHash && previousSignals) {
    return { signals: previousSignals, urlHash: currentUrlHash, skippedLlm: true };
  }

  const signalSchema = z.object({
    type: z.enum([
      'earnings_call',
      'product_announcement',
      'executive_hire',
      'executive_departure',
      'funding_round',
      'acquisition',
      'industry_news',
      'job_posting_signal',
    ]),
    title: z.string(),
    summary: z.string().max(300),
    url: z.string(),
    publishedAt: z.string(),
    relevanceScore: z.number().min(1).max(10),
    suggestedPlay: z
      .enum([
        'new_buying_group',
        'event_invite',
        'feature_release',
        're_engagement',
        'champion_enablement',
        'none',
      ])
      .optional(),
  });

  const { object } = await generateObject({
    model: getChatModel('fast'),
    schema: z.object({ signals: z.array(signalSchema) }),
    maxOutputTokens: 2000,
    prompt: `
You are analyzing news about ${companyName} (${companyDomain}) for a sales rep.
Industry: ${industry ?? 'Unknown'}

Raw search results:
${allResults
  .map(
    (r) => `
Title: ${r.title ?? 'No title'}
URL: ${r.url}
Published: ${r.publishedDate ?? 'Unknown'}
Summary: ${typeof r.summary === 'object' && r.summary?.content ? r.summary.content : (r as { text?: string }).text?.slice(0, 300) ?? 'No content'}
`
  )
  .join('\n---\n')}

For each relevant result:
1. Classify the signal type.
2. Write a 1-2 sentence summary a sales rep can act on (max 300 chars).
3. Score relevance 1-10 (10 = immediate sales opportunity, 1 = background noise).
4. Suggest which play this should trigger: new_buying_group, event_invite, feature_release, re_engagement, champion_enablement, or none.
   - executive_hire/departure → re_engagement or new_buying_group
   - earnings_call → re_engagement
   - product_announcement → feature_release or new_buying_group
   - funding_round → new_buying_group
   - acquisition → re_engagement

Only include signals with relevanceScore >= ${RELEVANCE_PERSIST_MIN}. Deduplicate: if multiple results are about the same event, keep only the best one.
Use the exact URL from the raw results for each signal. For publishedAt use the Published date from the result if present, otherwise use today's date in ISO format (YYYY-MM-DD).
`.trim(),
  });

  const nowIso = new Date().toISOString().split('T')[0];
  const signals: AccountSignal[] = (object.signals ?? [])
    .filter((s) => s.relevanceScore >= RELEVANCE_PERSIST_MIN)
    .map((s) => ({
      ...s,
      publishedAt: s.publishedAt && s.publishedAt !== 'Unknown' ? s.publishedAt : nowIso,
      suggestedPlay: s.suggestedPlay === 'none' ? undefined : (s.suggestedPlay as SuggestedPlay),
      customSignalName: customUrlToName.get(s.url),
    }));

  return { signals, urlHash: currentUrlHash, skippedLlm: false };
}

/**
 * Classify pre-fetched results (e.g. from an Exa Webset) using the same LLM
 * pipeline as ad-hoc signals. Skips the Exa search step entirely.
 */
export async function classifyPreFetchedSignals(
  companyName: string,
  companyDomain: string,
  industry: string | null,
  preFetched: PreFetchedResult[],
  previousUrlHash?: string | null,
  previousSignals?: AccountSignal[]
): Promise<FetchSignalsResult> {
  if (preFetched.length === 0) {
    return { signals: [], urlHash: '', skippedLlm: true };
  }

  const asExaResults: ExaResult[] = preFetched.map((r) => ({
    title: r.title,
    url: r.url,
    publishedDate: r.publishedDate,
    text: r.text,
  }));

  const currentUrlHash = hashExaUrls(asExaResults);

  if (previousUrlHash && currentUrlHash === previousUrlHash && previousSignals) {
    return { signals: previousSignals, urlHash: currentUrlHash, skippedLlm: true };
  }

  const signalSchema = z.object({
    type: z.enum([
      'earnings_call',
      'product_announcement',
      'executive_hire',
      'executive_departure',
      'funding_round',
      'acquisition',
      'industry_news',
      'job_posting_signal',
    ]),
    title: z.string(),
    summary: z.string().max(300),
    url: z.string(),
    publishedAt: z.string(),
    relevanceScore: z.number().min(1).max(10),
    suggestedPlay: z
      .enum([
        'new_buying_group',
        'event_invite',
        'feature_release',
        're_engagement',
        'champion_enablement',
        'none',
      ])
      .optional(),
  });

  const { object } = await generateObject({
    model: getChatModel('fast'),
    schema: z.object({ signals: z.array(signalSchema) }),
    maxOutputTokens: 2000,
    prompt: `
You are analyzing news about ${companyName} (${companyDomain}) for a sales rep.
Industry: ${industry ?? 'Unknown'}

Raw search results (from persistent monitoring):
${asExaResults
  .map(
    (r) => `
Title: ${r.title ?? 'No title'}
URL: ${r.url}
Published: ${r.publishedDate ?? 'Unknown'}
Summary: ${r.text?.slice(0, 300) ?? 'No content'}
`
  )
  .join('\n---\n')}

For each relevant result:
1. Classify the signal type.
2. Write a 1-2 sentence summary a sales rep can act on (max 300 chars).
3. Score relevance 1-10 (10 = immediate sales opportunity, 1 = background noise).
4. Suggest which play this should trigger: new_buying_group, event_invite, feature_release, re_engagement, champion_enablement, or none.

Only include signals with relevanceScore >= ${RELEVANCE_PERSIST_MIN}. Deduplicate: if multiple results are about the same event, keep only the best one.
Use the exact URL from the raw results for each signal. For publishedAt use the Published date from the result if present, otherwise use today's date in ISO format (YYYY-MM-DD).
`.trim(),
  });

  const nowIso = new Date().toISOString().split('T')[0];
  const signals: AccountSignal[] = (object.signals ?? [])
    .filter((s) => s.relevanceScore >= RELEVANCE_PERSIST_MIN)
    .map((s) => ({
      ...s,
      publishedAt: s.publishedAt && s.publishedAt !== 'Unknown' ? s.publishedAt : nowIso,
      suggestedPlay: s.suggestedPlay === 'none' ? undefined : (s.suggestedPlay as SuggestedPlay),
    }));

  return { signals, urlHash: currentUrlHash, skippedLlm: false };
}
