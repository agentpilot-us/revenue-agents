/**
 * POST /api/content-library/firecrawl/process-crawl
 * Process a completed Firecrawl crawl: fetch results, extract case studies, save to Content Library.
 * Body: { crawlId: string, productId: string }
 * Use after starting a crawl with wait: false, or from a webhook when event is "completed".
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getCrawlStatus } from '@/lib/tools/firecrawl';
import { parseCaseStudiesFromCrawlPages } from '@/lib/content-library/firecrawl-workflows';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { crawlId, productId } = await req.json();
    if (!crawlId || typeof crawlId !== 'string') {
      return NextResponse.json({ error: 'crawlId is required' }, { status: 400 });
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

    const status = await getCrawlStatus(crawlId);
    if (!status.ok) {
      return NextResponse.json({ error: status.error }, { status: 500 });
    }
    if (status.status !== 'completed') {
      return NextResponse.json(
        { error: `Crawl not completed yet. Status: ${status.status}` },
        { status: 400 }
      );
    }
    if (!status.data?.length) {
      return NextResponse.json(
        { success: true, synced: 0, message: 'Crawl completed but no page data returned.' },
        { status: 200 }
      );
    }

    const items = await parseCaseStudiesFromCrawlPages(status.data);
    let synced = 0;
    for (const item of items) {
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
      total: items.length,
    });
  } catch (error) {
    console.error('Firecrawl process-crawl error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Process failed' },
      { status: 500 }
    );
  }
}
