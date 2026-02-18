/**
 * Refresh a single Content Library item by re-fetching its sourceUrl.
 * Updates content and RAG chunks. Used by schedule cron and optional "Refresh now" UI.
 */
import { prisma } from '@/lib/db';
import { scrapeUrl } from '@/lib/tools/firecrawl';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';

export type RefreshResult = { ok: true; title: string } | { ok: false; error: string };

export async function refreshContentLibraryItem(
  contentLibraryId: string,
  userId: string
): Promise<RefreshResult> {
  const item = await prisma.contentLibrary.findFirst({
    where: { id: contentLibraryId, userId, isActive: true, archivedAt: null },
    select: { id: true, title: true, sourceUrl: true, content: true },
  });

  if (!item) {
    return { ok: false, error: 'Content not found' };
  }

  if (!item.sourceUrl?.trim()) {
    return { ok: false, error: 'No source URL to refresh' };
  }

  const scrapeResult = await scrapeUrl({
    url: item.sourceUrl,
    formats: ['markdown'],
    onlyMainContent: true,
  });

  if (!scrapeResult.ok || !scrapeResult.markdown) {
    return { ok: false, error: scrapeResult.error ?? 'Failed to fetch URL' };
  }

  const markdown = scrapeResult.markdown.slice(0, 100_000);
  const existingContent = (item.content as { markdown?: string; description?: string; suggestedType?: string }) ?? {};
  const newContent = {
    ...existingContent,
    markdown,
  };

  await prisma.contentLibrary.update({
    where: { id: contentLibraryId },
    data: {
      content: newContent,
      scrapedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  try {
    await ingestContentLibraryChunks(contentLibraryId, markdown);
  } catch (e) {
    console.error('RAG ingest failed on refresh', contentLibraryId, e);
    // Still return ok – content was updated
  }

  return { ok: true, title: item.title };
}
