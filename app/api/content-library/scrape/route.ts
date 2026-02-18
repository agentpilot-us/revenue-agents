import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { scrapeUrl, mapUrl } from '@/lib/tools/firecrawl';
import {
  categorizePage,
  suggestedTypeToContentType,
} from '@/lib/content-library/import-pipeline';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';

const MAX_FULL_SITE_URLS = 40;
const SCRAPE_TIMEOUT_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.FIRECRAWL_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Firecrawl is not configured. Add FIRECRAWL_API_KEY.' },
        { status: 503 }
      );
    }

    let body: {
      url?: string;
      urls?: string[];
      sourceUrl?: string;
      mode?: 'full' | 'selected';
      selectedUrls?: string[];
      limit?: number;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    let urlsToScrape: string[] = [];

    if (body.url && typeof body.url === 'string') {
      urlsToScrape = [body.url.startsWith('http') ? body.url : `https://${body.url}`];
    } else if (Array.isArray(body.urls) && body.urls.length > 0) {
      urlsToScrape = body.urls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => (u.startsWith('http') ? u : `https://${u}`));
    } else if (body.sourceUrl && body.mode === 'full') {
      const baseUrl =
        body.sourceUrl.startsWith('http') ? body.sourceUrl : `https://${body.sourceUrl}`;
      const mapResult = await mapUrl({
        url: baseUrl,
        limit: Math.min(body.limit ?? MAX_FULL_SITE_URLS, 500),
      });
      if (!mapResult.ok) {
        return NextResponse.json({ error: mapResult.error }, { status: 503 });
      }
      urlsToScrape = mapResult.links.map((l) => l.url).slice(0, MAX_FULL_SITE_URLS);
    } else if (body.sourceUrl && body.mode === 'selected' && Array.isArray(body.selectedUrls)) {
      urlsToScrape = body.selectedUrls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => (u.startsWith('http') ? u : `https://${u}`));
    }

    if (urlsToScrape.length === 0) {
      return NextResponse.json(
        { error: 'Provide url, urls, or sourceUrl + mode (full | selected) with selectedUrls' },
        { status: 400 }
      );
    }

    const existing = await prisma.contentLibrary.findMany({
      where: {
        userId: session.user.id,
        sourceUrl: { in: urlsToScrape },
        isActive: true,
      },
      select: { sourceUrl: true },
    });
    const existingSet = new Set(existing.map((r) => r.sourceUrl));

    const created: { id: string; title: string; type: string; sourceUrl: string | null }[] = [];
    const deadline = Date.now() + SCRAPE_TIMEOUT_MS;

    for (const pageUrl of urlsToScrape) {
      if (Date.now() > deadline) break;
      if (existingSet.has(pageUrl)) continue;

      const scrapeResult = await scrapeUrl({
        url: pageUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      });
      if (!scrapeResult.ok || !scrapeResult.markdown) continue;

      const markdown = scrapeResult.markdown;
      let categorized: { title: string; description: string; suggestedType: string; industry?: string; department?: string };
      try {
        categorized = await categorizePage(pageUrl, markdown);
      } catch {
        categorized = {
          title: pageUrl.replace(/^https?:\/\//, '').slice(0, 300),
          description: '',
          suggestedType: 'Other',
        };
      }

      const contentType = suggestedTypeToContentType(categorized.suggestedType);
      const contentPayload = {
        markdown: markdown.slice(0, 100_000),
        description: categorized.description ?? '',
        suggestedType: categorized.suggestedType,
      };

      const row = await prisma.contentLibrary.create({
        data: {
          userId: session.user.id,
          productId: null,
          title: categorized.title.slice(0, 500),
          type: contentType,
          content: contentPayload,
          industry: categorized.industry ?? null,
          department: categorized.department ?? null,
          sourceUrl: pageUrl,
          userConfirmed: true,
          scrapedAt: new Date(),
        },
        select: { id: true, title: true, type: true, sourceUrl: true },
      });

      try {
        await ingestContentLibraryChunks(row.id, contentPayload.markdown);
      } catch (e) {
        console.error('RAG ingest failed for', row.id, e);
      }

      created.push(row);
      existingSet.add(pageUrl);
    }

    return NextResponse.json({
      created: created.length,
      items: created,
    });
  } catch (error) {
    console.error('Content library scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
