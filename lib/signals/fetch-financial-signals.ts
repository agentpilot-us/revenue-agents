/**
 * Fetch earnings/financial context for a company via Perplexity (SEC, transcripts, analyst data).
 * Use when you need depth on earnings calls or 8-K filings; optional from the account-signals cron.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getChatModel } from '@/lib/llm/get-model';

export type EarningsSignal = {
  summary: string;
  guidance: string;
  keyThemes: string[];
};

export async function fetchEarningsSignal(
  companyName: string,
  ticker?: string
): Promise<EarningsSignal | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const query = ticker
    ? `What happened on ${companyName} (${ticker}) most recent earnings call? Summarize: key results, guidance, and themes relevant to enterprise software purchasing decisions.`
    : `What are the most recent financial results and business announcements for ${companyName}? Focus on budget implications, growth signals, and strategic priorities.`;

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: query }],
      max_tokens: 1024,
      search_domain_filter: ['sec.gov', 'seekingalpha.com', 'fool.com', 'businesswire.com'],
      search_recency_filter: 'month',
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const { object } = await generateObject({
    model: getChatModel(),
    schema: z.object({
      summary: z.string(),
      guidance: z.string(),
      keyThemes: z.array(z.string()).max(4),
    }),
    maxOutputTokens: 500,
    prompt: `Extract key points from this earnings/financial summary for a sales rep:\n\n${content.slice(0, 4000)}`,
  });

  return object;
}
