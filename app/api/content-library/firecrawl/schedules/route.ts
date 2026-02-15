/**
 * GET  /api/content-library/firecrawl/schedules – list user's crawl schedules
 * POST /api/content-library/firecrawl/schedules – create or update a schedule
 * Body: { url, productId, contentType: 'case-studies' | 'use-cases', frequency: 'daily' | 'weekly', includePaths?: string[], limit?: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function nextRunFromFrequency(frequency: string): Date {
  const d = new Date();
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await prisma.contentCrawlSchedule.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { nextRunAt: 'asc' },
    });
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('GET schedules error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { url, productId, contentType, frequency, includePaths, limit } = body;
    if (!url || !productId || !contentType || !frequency) {
      return NextResponse.json(
        { error: 'url, productId, contentType, and frequency are required' },
        { status: 400 }
      );
    }
    if (!['case-studies', 'use-cases'].includes(contentType)) {
      return NextResponse.json(
        { error: 'contentType must be case-studies or use-cases' },
        { status: 400 }
      );
    }
    if (!['daily', 'weekly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'frequency must be daily or weekly' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: session.user.id },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const includePathsStr =
      Array.isArray(includePaths) && includePaths.length > 0
        ? JSON.stringify(includePaths)
        : null;

    const data = {
      url,
      includePaths: includePathsStr,
      limit: typeof limit === 'number' ? limit : 50,
      frequency,
    };

    if (body.id && typeof body.id === 'string') {
      const existing = await prisma.contentCrawlSchedule.findFirst({
        where: { id: body.id, userId: session.user.id },
      });
      if (existing) {
        const schedule = await prisma.contentCrawlSchedule.update({
          where: { id: body.id },
          data,
          include: { product: { select: { id: true, name: true } } },
        });
        return NextResponse.json({ schedule });
      }
    }

    const schedule = await prisma.contentCrawlSchedule.create({
      data: {
        userId: session.user.id,
        productId,
        contentType,
        nextRunAt: nextRunFromFrequency(frequency),
        ...data,
      },
      include: { product: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('POST schedules error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
