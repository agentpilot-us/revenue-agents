/**
 * Firecrawl – scrape URLs (e.g. for referral examples).
 * Optional: can combine with Google Docs for scrape_referral_examples.
 */

export type ScrapeUrlParams = {
  url: string;
  formats?: ('markdown' | 'html')[];
};

export type ScrapeUrlResult =
  | { ok: true; markdown?: string; html?: string }
  | { ok: false; error: string };

export async function scrapeUrl(params: ScrapeUrlParams): Promise<ScrapeUrlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'FIRECRAWL_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: params.url,
        formats: params.formats ?? ['markdown'],
      }),
    });
    const data = (await res.json()) as { success?: boolean; markdown?: string; html?: string; error?: string };
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error ?? res.statusText };
    }
    return { ok: true, markdown: data.markdown, html: data.html };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Scrape failed' };
  }
}
