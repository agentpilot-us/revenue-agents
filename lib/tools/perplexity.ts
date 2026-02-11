/**
 * Perplexity – company/account research.
 */

export type ResearchCompanyParams = {
  query: string;
  companyDomain?: string;
  companyName?: string;
};

export type ResearchCompanyResult =
  | { ok: true; summary: string; raw?: Record<string, unknown> }
  | { ok: false; error: string };

export async function researchCompany(
  params: ResearchCompanyParams
): Promise<ResearchCompanyResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'PERPLEXITY_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: params.query,
          },
        ],
        max_tokens: 1024,
      }),
    });
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    if (!res.ok) {
      return { ok: false, error: (data as { error?: { message?: string } }).error?.message ?? res.statusText };
    }
    const summary = data.choices?.[0]?.message?.content ?? '';
    return { ok: true, summary, raw: data as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Research failed' };
  }
}
