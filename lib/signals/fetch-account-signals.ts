/**
 * Fetch realtime account signals via Exa (news, financial, executive) and classify with one LLM call per company.
 * When Exa's publishedDate is missing we use cron run time so signals still surface in the 48h dashboard window.
 */

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

/**
 * One LLM call per company: classify all Exa results in a single generateObject.
 * Only return signals with relevanceScore >= RELEVANCE_PERSIST_MIN (stored in DB; dashboard filters >= 7).
 */
export async function fetchAccountSignals(
  companyName: string,
  companyDomain: string,
  industry: string | null,
  lookbackHours: number = 48
): Promise<AccountSignal[]> {
  if (!exa) {
    return [];
  }

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  // Run 3 Exa searches in parallel. Use category "news" and "financial report" (they support startPublishedDate).
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

  if (allResults.length === 0) return [];

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
    model: getChatModel(),
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
      // When Exa omits publishedDate we use cron run time so the signal still passes publishedAt >= 48h ago in the UI.
      publishedAt: s.publishedAt && s.publishedAt !== 'Unknown' ? s.publishedAt : nowIso,
      suggestedPlay: s.suggestedPlay === 'none' ? undefined : (s.suggestedPlay as SuggestedPlay),
    }));

  return signals;
}
