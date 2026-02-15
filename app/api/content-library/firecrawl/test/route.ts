import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { scrapeUrl } from '@/lib/tools/firecrawl';

/**
 * GET /api/content-library/firecrawl/test
 * Verifies the Firecrawl API key and scrape endpoint. Call this to confirm scraping works.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await scrapeUrl({
      url: 'https://example.com',
      formats: ['markdown'],
      onlyMainContent: true,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error,
        detail:
          result.error.includes('FIRECRAWL_API_KEY') || result.error.includes('not configured')
            ? 'Add FIRECRAWL_API_KEY to .env.local and restart the server.'
            : 'Firecrawl scrape failed. Check your API key and quota at firecrawl.dev.',
      });
    }

    const markdownLength = result.markdown?.length ?? 0;
    return NextResponse.json({
      ok: true,
      message: 'Firecrawl is working.',
      markdownLength,
      snippet: result.markdown?.slice(0, 200) ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: 'Test failed', detail: message },
      { status: 500 }
    );
  }
}
