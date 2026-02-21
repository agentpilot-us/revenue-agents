/**
 * AgentPilot — Batch Scrape Endpoint
 * app/api/content-library/batch-scrape/route.ts
 *
 * WHY THIS EXISTS:
 * The original single-URL scrape route works for one page at a time but
 * creates a painful onboarding experience — an AE shouldn't have to paste
 * 20 URLs one by one. This endpoint accepts a list of prioritized URLs from
 * the map/prioritize step, processes them in parallel with controlled
 * concurrency, and streams real-time progress back to the UI via SSE.
 *
 * SSE: EventSource is GET-only. Frontend must use fetch POST + response.body
 * reader to consume this stream (see comment at bottom of file).
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { Prisma, ContentType } from '@prisma/client';
import { scrapeUrl } from '@/lib/tools/firecrawl';
import {
  enrichScrapedContent,
  scoreContentLibraryHealth,
  type StructuredPageExtraction,
} from '@/lib/content-library/structured-extraction';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';
import { getChatModel } from '@/lib/llm/get-model';
import { calculateContentHash } from '@/lib/content-library/content-hash';

const MAX_CONCURRENCY = 5;
const MAX_URLS = 30;
const SCRAPE_TIMEOUT_MS = 30000;

type BatchScrapeRequest = {
  urls: string[];
  productId?: string;
};

type BatchScrapeEvent =
  | { type: 'started'; total: number }
  | { type: 'page'; url: string; index: number; total: number; status: 'ok' | 'error'; error?: string }
  | { type: 'complete'; saved: number; failed: number; health: ReturnType<typeof scoreContentLibraryHealth> | null }
  | { type: 'error'; message: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

  let body: BatchScrapeRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { urls: rawUrls, productId } = body;
  if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
    return new Response('urls must be a non-empty array', { status: 400 });
  }

  const urls = [...new Set(rawUrls.filter(isValidUrl))].slice(0, MAX_URLS);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const send = (event: BatchScrapeEvent) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  runBatchScrape({ urls, userId, productId, send }).finally(() => {
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function runBatchScrape({
  urls,
  userId,
  productId,
  send,
}: {
  urls: string[];
  userId: string;
  productId?: string;
  send: (event: BatchScrapeEvent) => void;
}) {
  send({ type: 'started', total: urls.length });

  let saved = 0;
  let failed = 0;
  let index = 0;

  for (let i = 0; i < urls.length; i += MAX_CONCURRENCY) {
    const batch = urls.slice(i, i + MAX_CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((url) => scrapeAndExtract({ url, userId, productId }))
    );

    // Index-based pairing — indexOf(result) is wrong when multiple results are identical (e.g. two timeouts)
    batch.forEach((url, j) => {
      const result = results[j];
      index++;

      if (result.status === 'fulfilled' && result.value.ok) {
        saved++;
        send({ type: 'page', url, index, total: urls.length, status: 'ok' });
      } else {
        failed++;
        const error =
          result.status === 'rejected'
            ? (result.reason?.message ?? 'Unknown error')
            : (result as PromiseFulfilledResult<{ ok: false; error: string }>).value.error;
        send({ type: 'page', url, index, total: urls.length, status: 'error', error });
      }
    });
  }

  try {
    const health = await getHealthScore(userId);
    send({ type: 'complete', saved, failed, health });
  } catch {
    send({ type: 'complete', saved, failed, health: null });
  }
}

async function scrapeAndExtract({
  url,
  userId,
  productId,
}: {
  url: string;
  userId: string;
  productId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let scrapeResult: Awaited<ReturnType<typeof scrapeUrl>>;
  try {
    scrapeResult = await withTimeout(
      scrapeUrl({ url, formats: ['markdown'], onlyMainContent: true }),
      SCRAPE_TIMEOUT_MS,
      `Scrape timed out after ${SCRAPE_TIMEOUT_MS / 1000}s`
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Scrape failed' };
  }

  if (!scrapeResult.ok) {
    return { ok: false, error: scrapeResult.error };
  }

  const markdown = scrapeResult.markdown ?? '';
  if (markdown.length < 100) {
    return { ok: false, error: 'Page content too thin to extract signal' };
  }

  let extraction: StructuredPageExtraction;
  let contentPayload: Record<string, unknown>;
  let suggestedType: string;

  try {
    ({ extraction, contentPayload, suggestedType } = await enrichScrapedContent(
      url,
      markdown,
      getChatModel()
    ));
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Extraction failed',
    };
  }

  if (extraction.confidence === 'low' && extraction.pageType === 'other') {
    return { ok: false, error: 'Low-signal page skipped (nav/legal/other)' };
  }

  const existing = await prisma.contentLibrary.findFirst({
    where: { userId, sourceUrl: url },
    select: { id: true, userConfirmed: true },
  });

  let rowId: string;

  if (existing) {
    if (!existing.userConfirmed) {
      await prisma.contentLibrary.update({
        where: { id: existing.id },
        data: {
          content: contentPayload as Prisma.InputJsonValue,
          type: suggestedType as ContentType,
          title: extraction.keyMessages[0] ?? url,
          scrapedAt: new Date(),
          contentHash: calculateContentHash(contentPayload),
        },
      });
    }
    rowId = existing.id;
  } else {
    const row = await prisma.contentLibrary.create({
      data: {
        userId,
        productId: productId ?? null,
        title: extraction.keyMessages[0] ?? url,
        type: suggestedType as ContentType,
        content: contentPayload as Prisma.InputJsonValue,
        sourceUrl: url,
        userConfirmed: false,
        scrapedAt: new Date(),
        contentHash: calculateContentHash(contentPayload),
        version: '1.0',
      },
    });
    rowId = row.id;
  }

  await ingestContentLibraryChunks(rowId, markdown);

  return { ok: true };
}

async function getHealthScore(userId: string) {
  const items = await prisma.contentLibrary.findMany({
    where: { userId, isActive: true },
    select: {
      type: true,
      userConfirmed: true,
      content: true,
      industry: true,
      department: true,
      sourceUrl: true,
    },
  });

  const mapped = items.map((item) => ({
    type: item.type,
    userConfirmed: item.userConfirmed,
    extraction: (item.content as { extraction?: StructuredPageExtraction })?.extraction ?? undefined,
    content: item.content as Record<string, unknown>,
    industry: item.industry ?? undefined,
    department: item.department ?? undefined,
  }));

  const canonicalOrigin = process.env.CONTENT_LIBRARY_PRODUCT_ORIGIN?.trim();
  let productUrl: string | undefined;
  if (canonicalOrigin) {
    try {
      productUrl = new URL(canonicalOrigin).origin;
    } catch {
      productUrl = undefined;
    }
  }
  if (!productUrl) {
    const firstUrl = items.find((i) => i.sourceUrl)?.sourceUrl;
    productUrl = firstUrl ? getOrigin(firstUrl) : undefined;
  }

  return scoreContentLibraryHealth(mapped, productUrl);
}

function isValidUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

/*
FRONTEND SSE CONSUMER (reference — implement in ContentLibraryActions.tsx):

EventSource only supports GET. This endpoint uses POST with a body (URL list).
Use fetch() and read response.body with getReader():

  const res = await fetch('/api/content-library/batch-scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: urls.slice(0, 30), productId }),
  });
  if (!res.ok || !res.body) { ... }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === 'started') setBatchProgress({ total: event.total, done: 0 });
      else if (event.type === 'page') setBatchProgress(prev => prev ? { ...prev, done: event.index } : null);
      else if (event.type === 'complete') { setBatchProgress(null); await refresh(); if (event.health) setHealth(event.health); }
      else if (event.type === 'error') { setError(event.message); setBatchProgress(null); }
    }
  }
*/
