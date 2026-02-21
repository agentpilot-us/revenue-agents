import { NextRequest, NextResponse } from 'next/server';
import type { ContentType, Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { scrapeUrl, mapUrl } from '@/lib/tools/firecrawl';
import {
  enrichScrapedContent,
  type StructuredPageExtraction,
} from '@/lib/content-library/structured-extraction';
import { getChatModel } from '@/lib/llm/get-model';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';
import { calculateContentHash } from '@/lib/content-library/content-hash';

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
      reviewMode?: boolean; // If true, return items without saving
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

    const reviewMode = body.reviewMode === true;
    const model = getChatModel();
    const created: { id: string; title: string; type: string; sourceUrl: string | null; extraction?: StructuredPageExtraction }[] = [];
    const reviewItems: {
      url: string;
      title: string;
      description: string;
      suggestedType: string;
      type: string;
      industry?: string;
      department?: string;
      contentPayload: unknown;
      extraction: StructuredPageExtraction;
    }[] = [];
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
      let extraction: StructuredPageExtraction;
      let contentPayload: Record<string, unknown>;
      let suggestedType: string;
      try {
        const enriched = await enrichScrapedContent(pageUrl, markdown, model);
        extraction = enriched.extraction;
        contentPayload = enriched.contentPayload as Record<string, unknown>;
        suggestedType = enriched.suggestedType;
      } catch (e) {
        console.error('Structured extraction failed for', pageUrl, e);
        continue;
      }

      const title = extraction.keyMessages[0] ?? pageUrl.replace(/^https?:\/\//, '').slice(0, 500);

      if (reviewMode) {
        reviewItems.push({
          url: pageUrl,
          title: title.slice(0, 500),
          description: extraction.keyMessages[0] ?? '',
          suggestedType,
          type: suggestedType,
          contentPayload,
          extraction,
        });
      } else {
        const contentHash = calculateContentHash(contentPayload);

        const row = await prisma.contentLibrary.create({
          data: {
            userId: session.user.id,
            productId: null,
            title: title.slice(0, 500),
            type: suggestedType as ContentType,
            content: contentPayload as Prisma.InputJsonValue,
            contentHash,
            version: '1.0',
            industry: null,
            department: null,
            sourceUrl: pageUrl,
            userConfirmed: false,
            scrapedAt: new Date(),
          },
          select: { id: true, title: true, type: true, sourceUrl: true },
        });

        try {
          const md = (contentPayload.markdown as string) ?? '';
          await ingestContentLibraryChunks(row.id, md);
        } catch (e) {
          console.error('RAG ingest failed for', row.id, e);
        }

        created.push({ ...row, extraction });
      }
      existingSet.add(pageUrl);
    }

    if (reviewMode) {
      return NextResponse.json({
        reviewMode: true,
        items: reviewItems,
      });
    }

    return NextResponse.json({
      created: created.length,
      items: created,
    });
  } catch (error) {
    console.error('Content library fetch error:', error);
    return NextResponse.json(
      { error: 'Get data failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
