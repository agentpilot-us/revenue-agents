import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { startCrawl, getCrawlStatus } from '@/lib/tools/firecrawl';
import {
  filterByIndustry,
  categorizePage,
  type CategorizedContentPayload,
  type CategorizedContentItem,
} from '@/lib/content-library/import-pipeline';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  const { importId } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.FIRECRAWL_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Firecrawl is not configured. Add FIRECRAWL_API_KEY to enable smart import.' },
        { status: 503 }
      );
    }

    const contentImport = await prisma.contentImport.findFirst({
      where: { id: importId, userId: session.user.id },
      include: { user: { select: { companyWebsite: true, primaryIndustrySellTo: true } } },
    });
    if (!contentImport) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }
    if (
      !['PENDING', 'DISCOVERING', 'SCRAPING', 'CATEGORIZING'].includes(contentImport.status)
    ) {
      return NextResponse.json(
        { error: 'Import is not in a runnable state' },
        { status: 400 }
      );
    }

    const sourceUrl = contentImport.sourceUrl;
    const industry = contentImport.industry ?? contentImport.user?.primaryIndustrySellTo ?? '';

    await prisma.contentImport.update({
      where: { id: importId },
      data: { status: 'DISCOVERING' },
    });

    let crawlData: { markdown?: string; metadata?: { sourceURL?: string } }[] = [];

    try {
      const crawlResult = await startCrawl({
        url: sourceUrl,
        limit: 40,
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
      });
      if (!crawlResult.ok) {
        await prisma.contentImport.update({
          where: { id: importId },
          data: {
            status: 'FAILED',
            errors: { step: 'discover', error: crawlResult.error },
          },
        });
        return NextResponse.json(
          { error: 'Crawl failed', details: crawlResult.error },
          { status: 502 }
        );
      }

      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        const statusResult = await getCrawlStatus(crawlResult.crawlId);
        if (!statusResult.ok) {
          await prisma.contentImport.update({
            where: { id: importId },
            data: {
              status: 'FAILED',
              errors: { step: 'scrape', error: statusResult.error },
            },
          });
          return NextResponse.json(
            { error: 'Crawl status failed', details: statusResult.error },
            { status: 502 }
          );
        }
        const total = statusResult.total ?? 0;
        const completed = statusResult.completed ?? (statusResult.data?.length ?? 0);
        const hasProgress = total > 0 || completed > 0 || (statusResult.data?.length ?? 0) > 0;
        if (hasProgress) {
          await prisma.contentImport.update({
            where: { id: importId },
            data: {
              status: 'SCRAPING',
              totalPages: total || (statusResult.data?.length ?? 0),
              scrapedPages: completed || (statusResult.data?.length ?? 0),
            },
          });
        }
        if (statusResult.status === 'completed' && statusResult.data?.length) {
          crawlData = statusResult.data;
          break;
        }
        if (statusResult.status === 'failed') {
          await prisma.contentImport.update({
            where: { id: importId },
            data: {
              status: 'FAILED',
              errors: { step: 'scrape', error: 'Crawl failed on Firecrawl' },
            },
          });
          return NextResponse.json(
            { error: 'Crawl failed', details: 'Firecrawl reported crawl failure' },
            { status: 502 }
          );
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await prisma.contentImport.update({
        where: { id: importId },
        data: { status: 'FAILED', errors: { step: 'crawl', error: err } },
      });
      return NextResponse.json({ error: err }, { status: 500 });
    }

    if (crawlData.length === 0) {
      await prisma.contentImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          totalPages: 0,
          scrapedPages: 0,
          categorizedPages: 0,
          discoveredUrls: [],
          scrapedContent: [],
          categorizedContent: { items: [] } as CategorizedContentPayload,
          errors: {
            step: 'scrape',
            error: 'No pages discovered from this URL. Try a different URL or check that the site is accessible.',
          },
        },
      });
      return NextResponse.json({ ok: false, message: 'No pages discovered' }, { status: 200 });
    }

    const discoveredUrls = crawlData
      .map((d) => d.metadata?.sourceURL)
      .filter((u): u is string => Boolean(u));
    const filtered = filterByIndustry(crawlData, industry);
    const toProcess = filtered.length > 0 ? filtered : crawlData;
    const limit = Math.min(toProcess.length, 15);

    await prisma.contentImport.update({
      where: { id: importId },
      data: {
        status: 'SCRAPING',
        totalPages: crawlData.length,
        scrapedPages: crawlData.length,
        discoveredUrls,
        scrapedContent: crawlData.map((d) => ({
          url: d.metadata?.sourceURL,
          markdownLength: d.markdown?.length ?? 0,
        })),
      },
    });

    const items: CategorizedContentItem[] = [];
    for (let i = 0; i < limit; i++) {
      const item = toProcess[i];
      const pageUrl = item.metadata?.sourceURL ?? sourceUrl;
      const markdown = item.markdown ?? '';
      try {
        const categorized = await categorizePage(pageUrl, markdown);
        items.push({
          url: pageUrl,
          title: categorized.title,
          description: categorized.description,
          suggestedType: categorized.suggestedType,
          industry: categorized.industry,
          department: categorized.department,
        });
      } catch {
        items.push({
          url: pageUrl,
          title: pageUrl.replace(/^https?:\/\//, '').slice(0, 300),
          description: '',
          suggestedType: 'Other',
        });
      }
      await prisma.contentImport.update({
        where: { id: importId },
        data: { status: 'CATEGORIZING', categorizedPages: items.length },
      });
    }

    await prisma.contentImport.update({
      where: { id: importId },
      data: {
        status: 'REVIEW_PENDING',
        categorizedContent: { items } as unknown as object,
      },
    });

    return NextResponse.json({
      ok: true,
      totalPages: crawlData.length,
      categorizedCount: items.length,
    });
  } catch (e) {
    console.error('POST content-library/imports/execute', e);
    try {
      await prisma.contentImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errors: { step: 'categorize', error: e instanceof Error ? e.message : String(e) },
        },
      });
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Execute failed' },
      { status: 500 }
    );
  }
}
