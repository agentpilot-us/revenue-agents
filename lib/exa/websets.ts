/**
 * Exa Websets: persistent search monitors that accumulate results over time.
 * Uses REST API since the SDK may not expose websets yet.
 */

const EXA_API_KEY = process.env.EXA_API_KEY ?? process.env.EXASEARCH_API_KEY ?? '';
const EXA_BASE_URL = 'https://api.exa.ai';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': EXA_API_KEY,
  };
}

type WebsetSearchDef = { query: string };

type WebsetCreateResponse = {
  id: string;
  status?: string;
};

type WebsetItem = {
  url: string;
  title?: string;
  text?: string;
  publishedDate?: string;
};

type WebsetItemsResponse = {
  data?: WebsetItem[];
  results?: WebsetItem[];
};

/**
 * Create a persistent Exa Webset that monitors news, financial reports, and
 * executive changes for a company. Additional custom queries are appended as
 * extra searches.
 *
 * Returns the webset ID or null on failure.
 */
export async function createCompanyWebset(
  companyName: string,
  industry: string | null,
  customQueries?: string[]
): Promise<string | null> {
  if (!EXA_API_KEY) return null;

  try {
    const searches: WebsetSearchDef[] = [
      { query: `${companyName} ${industry ?? ''} news announcement product launch`.trim() },
      { query: `${companyName} earnings quarterly results SEC filing financial report`.trim() },
      { query: `${companyName} chief vice president director hired appointed joined departed executive changes`.trim() },
    ];

    if (customQueries?.length) {
      for (const q of customQueries) {
        searches.push({ query: q });
      }
    }

    const res = await fetch(`${EXA_BASE_URL}/websets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        searches,
        schedule: 'daily',
      }),
    });

    if (!res.ok) {
      console.warn(`Exa Webset create failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as WebsetCreateResponse;
    return data.id ?? null;
  } catch (err) {
    console.warn('Exa Webset create error:', err);
    return null;
  }
}

/**
 * Fetch new/unread results from a webset.
 */
export async function fetchWebsetResults(
  websetId: string
): Promise<Array<{ url: string; title: string; text?: string; publishedDate?: string }>> {
  if (!EXA_API_KEY) return [];

  try {
    const res = await fetch(`${EXA_BASE_URL}/websets/${websetId}/items`, {
      method: 'GET',
      headers: headers(),
    });

    if (!res.ok) {
      console.warn(`Exa Webset fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const body = (await res.json()) as WebsetItemsResponse;
    const items = body.data ?? body.results ?? [];

    return items
      .filter((item) => item.url)
      .map((item) => ({
        url: item.url,
        title: item.title ?? item.url,
        text: item.text,
        publishedDate: item.publishedDate,
      }));
  } catch (err) {
    console.warn('Exa Webset fetch error:', err);
    return [];
  }
}

/**
 * Delete a webset (cleanup when company is deleted).
 */
export async function deleteWebset(websetId: string): Promise<void> {
  if (!EXA_API_KEY) return;

  try {
    const res = await fetch(`${EXA_BASE_URL}/websets/${websetId}`, {
      method: 'DELETE',
      headers: headers(),
    });

    if (!res.ok) {
      console.warn(`Exa Webset delete failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn('Exa Webset delete error:', err);
  }
}
