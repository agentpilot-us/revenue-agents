/**
 * POST /api/cron/content-library/run-schedules
 * Run due Content Library crawl schedules (daily/weekly).
 * Call from Vercel Cron or external cron; require CRON_SECRET in Authorization header or query.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crawlAndParseCaseStudies } from '@/lib/content-library/firecrawl-workflows';
import { importUseCasesFromUrl } from '@/lib/content-library/firecrawl-workflows';

function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === secret;
  }
  const url = new URL(req.url);
  return url.searchParams.get('secret') === secret;
}

function nextRunAt(frequency: string): Date {
  const d = new Date();
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  return d;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.contentCrawlSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { product: { select: { id: true } } },
  });

  const results: { id: string; synced: number; error?: string }[] = [];

  for (const schedule of due) {
    try {
      if (schedule.contentType === 'case-studies') {
        const includePaths = schedule.includePaths
          ? (JSON.parse(schedule.includePaths) as string[])
          : undefined;
        const result = await crawlAndParseCaseStudies({
          url: schedule.url,
          limit: schedule.limit,
          includePaths,
          pollMaxMs: 180_000,
        });
        if (!result.ok) {
          results.push({ id: schedule.id, synced: 0, error: result.error });
          await prisma.contentCrawlSchedule.update({
            where: { id: schedule.id },
            data: { lastRunAt: now, nextRunAt: nextRunAt(schedule.frequency) },
          });
          continue;
        }
        for (const item of result.items) {
          const existing = await prisma.contentLibrary.findFirst({
            where: {
              userId: schedule.userId,
              productId: schedule.productId,
              type: 'SuccessStory',
              title: item.title,
              company: item.company ?? undefined,
            },
          });
          const data = {
            userId: schedule.userId,
            productId: schedule.productId,
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
        }
        results.push({ id: schedule.id, synced: result.items.length });
      } else if (schedule.contentType === 'use-cases') {
        const result = await importUseCasesFromUrl(schedule.url);
        if (!result.ok) {
          results.push({ id: schedule.id, synced: 0, error: result.error });
          await prisma.contentCrawlSchedule.update({
            where: { id: schedule.id },
            data: { lastRunAt: now, nextRunAt: nextRunAt(schedule.frequency) },
          });
          continue;
        }
        for (const item of result.items) {
          const existing = await prisma.contentLibrary.findFirst({
            where: {
              userId: schedule.userId,
              productId: schedule.productId,
              type: 'UseCase',
              title: item.title,
              sourceUrl: item.sourceUrl,
            },
          });
          const data = {
            userId: schedule.userId,
            productId: schedule.productId,
            title: item.title,
            type: 'UseCase' as const,
            content: item.content as object,
            industry: item.industry,
            department: item.department,
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
        }
        results.push({ id: schedule.id, synced: result.items.length });
      }

      await prisma.contentCrawlSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: nextRunAt(schedule.frequency) },
      });
    } catch (error) {
      results.push({
        id: schedule.id,
        synced: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await prisma.contentCrawlSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: nextRunAt(schedule.frequency) },
      });
    }
  }

  return NextResponse.json({
    ran: due.length,
    results,
  });
}
