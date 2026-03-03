/**
 * Refresh a single Content Library item by re-fetching its sourceUrl.
 * Skips extraction (LLM call) when page content hasn't changed since last scrape.
 * Updates content, RAG chunks, and extraction only when needed.
 */
import { prisma } from '@/lib/db';
import { scrapeUrl } from '@/lib/tools/firecrawl';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';
import { calculateContentHash } from './content-hash';
import { enrichScrapedContent } from './structured-extraction';

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
  const existingContent = (item.content as { markdown?: string; description?: string; suggestedType?: string; extraction?: Record<string, unknown> }) ?? {};
  const newContent = {
    ...existingContent,
    markdown,
  };

  const newHash = calculateContentHash(newContent);
  const hasChanged = item.contentHash !== newHash;

  // Skip extraction and RAG re-ingest when content hasn't changed
  if (!hasChanged) {
    await prisma.contentLibrary.update({
      where: { id: contentLibraryId },
      data: { scrapedAt: new Date() },
    });
    return { ok: true, title: item.title, changed: false };
  }

  // Content changed — run extraction on the new markdown
  let finalContent: object = newContent;
  try {
    const enriched = await enrichScrapedContent(item.sourceUrl, markdown);
    finalContent = enriched.contentPayload as object;
  } catch (e) {
    console.error('Re-extraction failed on refresh, keeping raw markdown', contentLibraryId, e);
  }

  let newVersion = item.version;
  let previousContent = item.previousContent;
  if (item.contentHash) {
    const currentVersion = item.version ? parseFloat(item.version) : 1;
    newVersion = String((currentVersion + 0.1).toFixed(1));
    previousContent = item.content as object;
  } else if (!item.version) {
    newVersion = '1.0';
  }

  await prisma.contentLibrary.update({
    where: { id: contentLibraryId },
    data: {
      content: finalContent,
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
  }

  return { ok: true, title: item.title, changed: true };
}
