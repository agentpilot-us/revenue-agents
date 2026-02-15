/**
 * POST /api/content-library/firecrawl/case-studies
 * Crawl case study pages and import into Content Library.
 * Body: { url: string, productId: string, includePaths?: string[], limit?: number, wait?: boolean }
 * - wait: true = poll until crawl completes and then save (may take 1–2 min). false = start crawl and return crawlId (use webhook for results).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  startCaseStudiesCrawl,
  crawlAndParseCaseStudies,
} from '@/lib/content-library/firecrawl-workflows';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, productId, includePaths, limit, wait, webhookUrl } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
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

    if (wait === true) {
      const result = await crawlAndParseCaseStudies({
        url,
        limit: limit ?? 50,
        includePaths: Array.isArray(includePaths) ? includePaths : undefined,
        pollMaxMs: 120_000,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, crawlId: result.crawlId },
          { status: 500 }
        );
      }

      let synced = 0;
      for (const item of result.items) {
        const existing = await prisma.contentLibrary.findFirst({
          where: {
            userId: session.user.id,
            productId,
            type: 'SuccessStory',
            title: item.title,
            company: item.company ?? undefined,
          },
        });
        const data = {
          userId: session.user.id,
          productId,
          title: item.title,
          type: 'SuccessStory' as const,
          content: item.content as object,
          industry: item.industry,
          company: item.company,
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
        crawlId: result.crawlId,
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const resolvedWebhookUrl =
      typeof webhookUrl === 'string' && webhookUrl
        ? webhookUrl
        : `${baseUrl}/api/content-library/webhooks/firecrawl`;

    const started = await startCaseStudiesCrawl({
      url,
      limit: limit ?? 100,
      includePaths: Array.isArray(includePaths) ? includePaths : undefined,
      webhookUrl: resolvedWebhookUrl,
      metadata: { userId: session.user.id, productId },
    });
    if (!started.ok) {
      return NextResponse.json({ error: started.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      crawlId: started.crawlId,
      url: started.url,
      message:
        'Crawl started. Configure a webhook (or poll GET /api/content-library/firecrawl/crawl-status?crawlId=...) to process results when the crawl completes.',
    });
  } catch (error) {
    console.error('Firecrawl case-studies error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}
