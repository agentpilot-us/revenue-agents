/**
 * Shared content import execution: crawl via Firecrawl, filter by industry, categorize with AI.
 * Used by the server action (background) and the execute API route (awaited).
 */
import { prisma } from '@/lib/db';
import { startCrawl, getCrawlStatus } from '@/lib/tools/firecrawl';
import {
  filterByIndustry,
  categorizePage,
  suggestedTypeToContentType,
  type CategorizedContentPayload,
  type CategorizedContentItem,
} from '@/lib/content-library/import-pipeline';

const CRAWL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_CATEGORIZE = 30; // Process up to 30 pages

export type ExecuteContentImportResult =
  | { ok: true; totalPages: number; categorizedCount: number }
  | { ok: false; error: string };

export async function executeContentImport(
  importId: string,
  userId: string
): Promise<ExecuteContentImportResult> {
  const log = (msg: string, ...args: unknown[]) =>
    console.log(`[Import ${importId}] ${msg}`, ...args);
  const logError = (msg: string, ...args: unknown[]) =>
    console.error(`[Import ${importId}] ${msg}`, ...args);

  try {
    if (!process.env.FIRECRAWL_API_KEY?.trim()) {
      logError('Firecrawl API key not configured');
      await prisma.contentImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errors: { step: 'config', error: 'Firecrawl is not configured. Add FIRECRAWL_API_KEY.' },
        },
      });
      return { ok: false, error: 'Firecrawl is not configured' };
    }

    const contentImport = await prisma.contentImport.findFirst({
      where: { id: importId, userId },
      include: { user: { select: { companyWebsite: true, primaryIndustrySellTo: true } } },
    });

    if (!contentImport) {
      logError('Import not found for user', userId);
      return { ok: false, error: 'Import not found' };
    }

    if (
      !['PENDING', 'DISCOVERING', 'SCRAPING', 'CATEGORIZING'].includes(contentImport.status)
    ) {
      return { ok: false, error: 'Import is not in a runnable state' };
    }

    const sourceUrl = contentImport.sourceUrl;
    const industry = contentImport.industry ?? contentImport.user?.primaryIndustrySellTo ?? '';
    log('Starting crawl for', sourceUrl);

    await prisma.contentImport.update({
      where: { id: importId },
      data: { status: 'DISCOVERING' },
    });

    let crawlData: { markdown?: string; metadata?: { sourceURL?: string } }[] = [];

    const crawlResult = await startCrawl({
      url: sourceUrl,
      limit: 40,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    });

    if (!crawlResult.ok) {
      logError('Crawl start failed:', crawlResult.error);
      await prisma.contentImport.update({
        where: { id: importId },
        data: { status: 'FAILED', errors: { step: 'discover', error: crawlResult.error } },
      });
      return { ok: false, error: crawlResult.error };
    }

    log('Crawl started:', crawlResult.crawlId);
    const deadline = Date.now() + CRAWL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const statusResult = await getCrawlStatus(crawlResult.crawlId);

      if (!statusResult.ok) {
        logError('Crawl status failed:', statusResult.error);
        await prisma.contentImport.update({
          where: { id: importId },
          data: { status: 'FAILED', errors: { step: 'scrape', error: statusResult.error } },
        });
        return { ok: false, error: statusResult.error };
      }

      const total = statusResult.total ?? 0;
      const completed = statusResult.completed ?? (statusResult.data?.length ?? 0);
      const hasProgress = total > 0 || completed > 0 || (statusResult.data?.length ?? 0) > 0;

      if (hasProgress) {
        await prisma.contentImport.update({
          where: { id: importId },
          data: {
            status: 'SCRAPING',
            totalPages: Math.max(total, statusResult.data?.length ?? 0),
            scrapedPages: Math.max(completed, statusResult.data?.length ?? 0),
          },
        });
      }

      if (statusResult.status === 'completed' && statusResult.data?.length) {
        crawlData = statusResult.data;
        log('Crawl completed, pages:', crawlData.length);
        break;
      }

      if (statusResult.status === 'failed') {
        logError('Crawl failed on Firecrawl');
        await prisma.contentImport.update({
          where: { id: importId },
          data: {
            status: 'FAILED',
            errors: { step: 'scrape', error: 'Crawl failed on Firecrawl' },
          },
        });
        return { ok: false, error: 'Crawl failed on Firecrawl' };
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (crawlData.length === 0) {
      logError('No pages discovered or crawl timed out');
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
            error:
              'No pages discovered from this URL. Try a different URL or check that the site is accessible. The crawl may have timed out for large sites.',
          },
        },
      });
      return { ok: false, error: 'No pages discovered' };
    }

    const discoveredUrls = crawlData
      .map((d) => d.metadata?.sourceURL)
      .filter((u): u is string => Boolean(u));
    const filtered = filterByIndustry(crawlData, industry);
    const toProcess = filtered.length > 0 ? filtered : crawlData;
    const limit = Math.min(toProcess.length, MAX_CATEGORIZE);

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

    log('Categorizing', limit, 'of', toProcess.length, 'pages');
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
      } catch (e) {
        logError('Categorize failed for', pageUrl, e);
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

    // Brief delay so progress UI can show CATEGORIZING state
    await new Promise((r) => setTimeout(r, 500));

    // Auto-approve: create ContentLibrary rows for all categorized items (userConfirmed: true)
    let product = await prisma.product.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          userId,
          name: 'Company content',
          description: 'Content from company setup / website import',
          category: 'Content',
        },
        select: { id: true },
      });
    }
    const urls = items.map((i) => i.url);
    const existingRows = await prisma.contentLibrary.findMany({
      where: { userId, sourceUrl: { in: urls }, isActive: true },
      select: { sourceUrl: true },
    });
    const existingUrlSet = new Set(existingRows.map((r) => r.sourceUrl));
    let created = 0;
    for (const item of items) {
      if (existingUrlSet.has(item.url)) continue;
      try {
        await prisma.contentLibrary.create({
          data: {
            userId,
            productId: product.id,
            title: item.title.slice(0, 500),
            type: suggestedTypeToContentType(item.suggestedType),
            content: { description: item.description ?? '', suggestedType: item.suggestedType },
            industry: item.industry ?? null,
            department: item.department ?? null,
            sourceUrl: item.url,
            userConfirmed: true,
            confidenceScore: 'medium',
            scrapedAt: new Date(),
          },
        });
        created++;
        existingUrlSet.add(item.url);
      } catch (err) {
        logError('Failed to create content library item for', item.url, err);
      }
    }

    await prisma.contentImport.update({
      where: { id: importId },
      data: {
        status: 'APPROVED',
        categorizedContent: { items } as unknown as object,
        reviewedAt: new Date(),
        approvedCount: created,
        rejectedCount: items.length - created,
      },
    });

    log('Import complete. Categorized', items.length, 'pages; auto-approved', created);
    return { ok: true, totalPages: crawlData.length, categorizedCount: items.length };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    logError('Import execution failed:', e);
    await prisma.contentImport.update({
      where: { id: importId },
      data: {
        status: 'FAILED',
        errors: { step: 'execute', error: err },
      },
    });
    return { ok: false, error: err };
  }
}
