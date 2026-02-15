/**
 * POST /api/content-library/firecrawl/use-cases
 * Scrape a use-cases URL and import extracted use cases into Content Library.
 * Body: { url: string, productId: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { importUseCasesFromUrl } from '@/lib/content-library/firecrawl-workflows';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, productId } = await req.json();
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

    const result = await importUseCasesFromUrl(url);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    let created = 0;
    for (const item of result.items) {
      const existing = await prisma.contentLibrary.findFirst({
        where: {
          userId: session.user.id,
          productId,
          type: 'UseCase',
          title: item.title,
          sourceUrl: item.sourceUrl,
        },
      });
      if (existing) {
        await prisma.contentLibrary.update({
          where: { id: existing.id },
          data: {
            content: item.content as object,
            industry: item.industry ?? undefined,
            department: item.department ?? undefined,
            sourceUrl: item.sourceUrl,
            scrapedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.contentLibrary.create({
          data: {
            userId: session.user.id,
            productId,
            title: item.title,
            type: 'UseCase',
            content: item.content as object,
            industry: item.industry,
            department: item.department,
            sourceUrl: item.sourceUrl,
            userConfirmed: true,
            scrapedAt: new Date(),
          },
        });
      }
      created++;
    }

    return NextResponse.json({
      success: true,
      synced: created,
      total: result.items.length,
    });
  } catch (error) {
    console.error('Firecrawl use-cases import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
