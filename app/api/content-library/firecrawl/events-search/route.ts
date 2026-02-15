/**
 * POST /api/content-library/firecrawl/events-search
 * Search the web for events and import into Content Library (CompanyEvent).
 * Body: { query: string, productId: string, eventSourceName?: string, limit?: number, scrape?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { searchEventsForContentLibrary } from '@/lib/content-library/firecrawl-workflows';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, productId, eventSourceName, limit, scrape } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: session.user.id },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!process.env.FIRECRAWL_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Firecrawl is not configured. Add FIRECRAWL_API_KEY to .env.' },
        { status: 503 }
      );
    }

    const result = await searchEventsForContentLibrary({
      query: query.trim(),
      limit: typeof limit === 'number' ? limit : 10,
      scrape: scrape !== false,
      eventSourceName: typeof eventSourceName === 'string' ? eventSourceName : 'Events',
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    let synced = 0;
    for (const item of result.items) {
      const existing = await prisma.contentLibrary.findFirst({
        where: {
          userId: session.user.id,
          productId,
          type: 'CompanyEvent',
          title: item.title,
          sourceUrl: item.sourceUrl ?? undefined,
        },
      });
      const data = {
        userId: session.user.id,
        productId,
        title: item.title,
        type: 'CompanyEvent' as const,
        content: item.content as object,
        persona: item.persona,
        sourceUrl: item.sourceUrl,
        userConfirmed: true,
        scrapedAt: new Date(),
      };
      if (existing) {
        await prisma.contentLibrary.update({
          where: { id: existing.id },
          data: { ...data, updatedAt: new Date() },
        });
      } else {
        await prisma.contentLibrary.create({ data });
      }
      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      total: result.items.length,
    });
  } catch (error) {
    console.error('Firecrawl events-search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
