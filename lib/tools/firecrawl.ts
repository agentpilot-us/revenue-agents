/**
 * Firecrawl v2 – scrape, crawl, and extract.
 * API: https://api.firecrawl.dev/v2
 * Docs: https://docs.firecrawl.dev
 */

const BASE = 'https://api.firecrawl.dev/v2';

export class FirecrawlConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirecrawlConfigError';
  }
}

function getHeaders(): Record<string, string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey?.trim()) {
    throw new FirecrawlConfigError('FIRECRAWL_API_KEY not configured in environment variables');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = Math.min(
          parseInt(response.headers.get('Retry-After') ?? '5', 10),
          60
        );
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      return response;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

// ----- Map (sitemap / discover links) -----

export type MapParams = {
  url: string;
  limit?: number;
  search?: string;
  sitemap?: 'skip' | 'include' | 'only';
};

export type MapLink = {
  url: string;
  title?: string;
  description?: string;
};

export type MapResult =
  | { ok: true; links: MapLink[] }
  | { ok: false; error: string };

/** Discover links on a site via Firecrawl /map (sitemap discovery). */
export async function mapUrl(params: MapParams): Promise<MapResult> {
  try {
    const headers = getHeaders();
    const res = await fetchWithRetry(`${BASE}/map`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: params.url,
        limit: params.limit ?? 500,
        ...(params.search && { search: params.search }),
        ...(params.sitemap && { sitemap: params.sitemap }),
      }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      links?: Array<{ url?: string; title?: string; description?: string }>;
      error?: string;
    };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.error ?? res.statusText ?? 'Map failed' };
    }
    const links = (json.links ?? []).map((l) => ({
      url: l.url ?? '',
      title: l.title,
      description: l.description,
    }));
    return { ok: true, links };
  } catch (e) {
    if (e instanceof FirecrawlConfigError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Map failed' };
  }
}

// ----- Scrape -----

export type ScrapeUrlParams = {
  url: string;
  formats?: ('markdown' | 'html')[];
  onlyMainContent?: boolean;
};

export type ScrapeUrlResult =
  | { ok: true; markdown?: string; html?: string }
  | { ok: false; error: string };

/** v2 formats: array of objects e.g. [{ type: 'markdown' }]. */
function toFormats(formats?: ('markdown' | 'html')[]): { type: string }[] {
  if (formats?.length) return formats.map((f) => ({ type: f }));
  return [{ type: 'markdown' }];
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: { markdown?: string; html?: string };
  error?: string;
}

export async function scrapeUrl(params: ScrapeUrlParams): Promise<ScrapeUrlResult> {
  try {
    const headers = getHeaders();
    const res = await fetchWithRetry(`${BASE}/scrape`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: params.url,
        formats: toFormats(params.formats),
        onlyMainContent: params.onlyMainContent ?? true,
      }),
    });
    const json = (await res.json()) as FirecrawlScrapeResponse;
    if (!res.ok || !json.success) {
      return { ok: false, error: json.error ?? res.statusText ?? 'Scrape failed' };
    }
    const data = json.data ?? {};
    return { ok: true, markdown: data.markdown, html: data.html };
  } catch (e) {
    if (e instanceof FirecrawlConfigError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Scrape failed' };
  }
}

// ----- Crawl -----

export type CrawlParams = {
  url: string;
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
  scrapeOptions?: {
    formats?: ('markdown' | 'html')[];
    onlyMainContent?: boolean;
  };
  webhook?: {
    url: string;
    events?: ('started' | 'page' | 'completed' | 'failed')[];
    metadata?: Record<string, unknown>;
  };
};

export type CrawlStartResult =
  | { ok: true; crawlId: string; url: string }
  | { ok: false; error: string };

export async function startCrawl(params: CrawlParams): Promise<CrawlStartResult> {
  try {
    const headers = getHeaders();
    const body: Record<string, unknown> = {
      url: params.url,
      limit: params.limit ?? 100,
      scrapeOptions: {
        formats: toFormats(params.scrapeOptions?.formats),
        onlyMainContent: params.scrapeOptions?.onlyMainContent ?? true,
      },
    };
    if (params.includePaths?.length) body.includePaths = params.includePaths;
    if (params.excludePaths?.length) body.excludePaths = params.excludePaths;
    if (params.webhook?.url) body.webhook = params.webhook;

    const res = await fetchWithRetry(`${BASE}/crawl`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      success?: boolean;
      id?: string;
      url?: string;
      error?: string;
    };
    if (!res.ok || !json.success || !json.id) {
      return { ok: false, error: json.error ?? res.statusText ?? 'Crawl start failed' };
    }
    return { ok: true, crawlId: json.id, url: json.url ?? params.url };
  } catch (e) {
    if (e instanceof FirecrawlConfigError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Crawl start failed' };
  }
}

export type CrawlPageData = {
  markdown?: string;
  metadata?: { sourceURL?: string; sourceUrl?: string };
};

export type CrawlStatusResult =
  | { ok: true; status: string; data?: CrawlPageData[]; total?: number; completed?: number }
  | { ok: false; error: string };

function normalizeCrawlPage(p: Record<string, unknown>): CrawlPageData {
  const meta = (p.metadata as Record<string, unknown> | undefined) ?? {};
  const sourceURL =
    (meta.sourceURL as string | undefined) ?? (meta.sourceUrl as string | undefined);
  return {
    markdown: typeof p.markdown === 'string' ? p.markdown : undefined,
    metadata: sourceURL !== undefined ? { sourceURL } : undefined,
  };
}

/** Poll crawl status and return completed page data. Follows v2 `next` URL when response is paginated. */
export async function getCrawlStatus(crawlId: string): Promise<CrawlStatusResult> {
  try {
    const headers = getHeaders();
    let url: string = `${BASE}/crawl/${crawlId}`;
    const allData: CrawlPageData[] = [];
    let status = 'unknown';
    let total: number | undefined;
    let completed: number | undefined;

    while (url) {
      const res = await fetchWithRetry(url, { method: 'GET', headers });
      const raw = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        return { ok: false, error: (raw.error as string) ?? res.statusText };
      }
      // v2 may return envelope { success, data: { status, data, next } } or flat { status, data, next }
      const envelope = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : raw;
      const statusVal = (envelope.status as string) ?? ((raw.success as boolean) ? 'completed' : 'unknown');
      if (statusVal) status = statusVal;
      if (typeof envelope.total === 'number') total = envelope.total;
      if (typeof envelope.completed === 'number') completed = envelope.completed;
      const arr = envelope.data;
      const pageData = Array.isArray(arr)
        ? arr.map((p) => normalizeCrawlPage(p as Record<string, unknown>))
        : [];
      allData.push(...pageData);
      const nextUrl = envelope.next as string | null | undefined;
      url = nextUrl && typeof nextUrl === 'string' ? nextUrl : '';
    }

    if (completed === undefined && allData.length > 0) completed = allData.length;

    return {
      ok: true,
      status,
      data: allData.length ? allData : undefined,
      total,
      completed,
    };
  } catch (e) {
    if (e instanceof FirecrawlConfigError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Get crawl status failed' };
  }
}

// ----- Search -----

export type SearchParams = {
  query: string;
  limit?: number;
  scrape?: boolean; // if true, request markdown for each result
  country?: string;
};

export type SearchResultItem = {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
};

export type SearchResult =
  | { ok: true; web: SearchResultItem[] }
  | { ok: false; error: string };

export async function search(params: SearchParams): Promise<SearchResult> {
  try {
    const headers = getHeaders();
    const res = await fetchWithRetry(`${BASE}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: params.query,
        limit: params.limit ?? 10,
        ...(params.scrape && {
          scrapeOptions: {
            formats: [{ type: 'markdown' as const }],
            onlyMainContent: true,
          },
        }),
        ...(params.country && { country: params.country }),
      }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }> };
      error?: string;
    };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.error ?? res.statusText ?? 'Search failed' };
    }
    const web = json.data?.web ?? [];
    return {
      ok: true,
      web: web.map((r) => ({
        url: r.url ?? '',
        title: r.title ?? '',
        description: r.description,
        markdown: r.markdown,
      })),
    };
  } catch (e) {
    if (e instanceof FirecrawlConfigError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Search failed' };
  }
}

// ----- Extract -----

export type ExtractParams = {
  urls: string[];
  schema: Record<string, unknown>;
  prompt?: string;
  scrapeOptions?: {
    formats?: ('markdown' | 'html')[];
    onlyMainContent?: boolean;
  };
};

export type ExtractResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export async function extract(params: ExtractParams): Promise<ExtractResult> {
  try {
    const headers = getHeaders();
    const res = await fetchWithRetry(`${BASE}/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        urls: params.urls,
        schema: params.schema,
        prompt: params.prompt,
        scrapeOptions: {
          formats: toFormats(params.scrapeOptions?.formats),
          onlyMainContent: params.scrapeOptions?.onlyMainContent ?? true,
        },
      }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: unknown;
      error?: string;
    };
    if (!res.ok || !json.success) {
      return { ok: false, error: json.error ?? res.statusText ?? 'Extract failed' };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    if (e instanceof FirecrawlConfigError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Extract failed' };
  }
}
