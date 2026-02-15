/**
 * POST /api/content-library/webhooks/firecrawl
 * Firecrawl webhook receiver for crawl events.
 * When type is "crawl.completed", fetch crawl results and import case studies into Content Library.
 * Expects metadata (userId, productId) to have been set when starting the crawl.
 *
 * Configure in Firecrawl dashboard or when calling startCrawl with webhook.url pointing to this route.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCrawlStatus } from '@/lib/tools/firecrawl';
import { parseCaseStudiesFromCrawlPages } from '@/lib/content-library/firecrawl-workflows';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.type as string | undefined;
    const crawlId = body.id as string | undefined;
    const metadata = (body.metadata ?? {}) as { userId?: string; productId?: string };

    if (!crawlId) {
      return NextResponse.json({ error: 'Missing id (crawl job id)' }, { status: 400 });
    }

    if (eventType === 'crawl.completed') {
      const userId = metadata.userId;
      const productId = metadata.productId;
      if (!userId || !productId) {
        console.warn('Firecrawl webhook: crawl.completed missing metadata.userId or metadata.productId');
        return NextResponse.json({ received: true, processed: false, reason: 'Missing metadata' });
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, userId },
        select: { id: true },
      });
      if (!product) {
        return NextResponse.json({ received: true, processed: false, reason: 'Product not found' });
      }

      const status = await getCrawlStatus(crawlId);
      if (!status.ok || status.status !== 'completed' || !status.data?.length) {
        return NextResponse.json({
          received: true,
          processed: false,
          reason: status.ok ? 'No data yet' : status.error,
        });
      }

      const items = await parseCaseStudiesFromCrawlPages(status.data);
      let synced = 0;
      for (const item of items) {
        const existing = await prisma.contentLibrary.findFirst({
          where: {
            userId,
            productId,
            type: 'SuccessStory',
            title: item.title,
            company: item.company ?? undefined,
          },
        });
        const data = {
          userId,
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
        received: true,
        processed: true,
        crawlId,
        synced,
        total: items.length,
      });
    }

    return NextResponse.json({ received: true, processed: false, type: eventType });
  } catch (error) {
    console.error('Firecrawl webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
