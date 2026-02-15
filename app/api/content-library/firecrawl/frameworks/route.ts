/**
 * POST /api/content-library/firecrawl/frameworks
 * Extract sales frameworks from docs URLs and save to Content Library.
 * Body: { urls: string[], productId: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { extractFrameworksFromUrls } from '@/lib/content-library/firecrawl-workflows';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { urls, productId } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
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

    const result = await extractFrameworksFromUrls(urls);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    let created = 0;
    for (const item of result.items) {
      const existing = await prisma.contentLibrary.findFirst({
        where: {
          userId: session.user.id,
          productId,
          type: 'Framework',
          title: item.title,
        },
      });
      const data = {
        userId: session.user.id,
        productId,
        title: item.title,
        type: 'Framework' as const,
        content: item.content as object,
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
      created++;
    }

    return NextResponse.json({
      success: true,
      synced: created,
      total: result.items.length,
    });
  } catch (error) {
    console.error('Firecrawl frameworks extract error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extract failed' },
      { status: 500 }
    );
  }
}
