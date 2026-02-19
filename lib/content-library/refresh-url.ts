/**
 * Refresh a single Content Library item by re-fetching its sourceUrl.
 * Updates content and RAG chunks. Used by schedule cron and optional "Refresh now" UI.
 */
import { prisma } from '@/lib/db';
import { scrapeUrl } from '@/lib/tools/firecrawl';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';
import { calculateContentHash } from './content-hash';

export type RefreshResult = { ok: true; title: string; changed: boolean } | { ok: false; error: string };

export async function refreshContentLibraryItem(
  contentLibraryId: string,
  userId: string
): Promise<RefreshResult> {
  const item = await prisma.contentLibrary.findFirst({
    where: { id: contentLibraryId, userId, isActive: true, archivedAt: null },
    select: { id: true, title: true, sourceUrl: true, content: true, contentHash: true, version: true, previousContent: true },
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
    const message = scrapeResult.ok === false ? scrapeResult.error : 'Failed to fetch URL';
    return { ok: false, error: message };
  }

  const markdown = scrapeResult.markdown.slice(0, 100_000);
  const existingContent = (item.content as { markdown?: string; description?: string; suggestedType?: string }) ?? {};
  const newContent = {
    ...existingContent,
    markdown,
  };

  // Calculate hash of new content
  const newHash = calculateContentHash(newContent);
  const hasChanged = item.contentHash !== newHash;

  // Increment version if content changed
  let newVersion = item.version;
  let previousContent = item.previousContent;
  if (hasChanged && item.contentHash) {
    const currentVersion = item.version ? parseFloat(item.version) : 1;
    newVersion = String((currentVersion + 0.1).toFixed(1));
    // Store previous content for diff comparison
    previousContent = item.content as object;
  } else if (!item.version) {
    newVersion = '1.0';
  }

  await prisma.contentLibrary.update({
    where: { id: contentLibraryId },
    data: {
      content: newContent,
      contentHash: newHash,
      previousContent: previousContent ?? undefined,
      version: newVersion,
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

  return { ok: true, title: item.title, changed: hasChanged };
}
