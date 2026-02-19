import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';
import { calculateContentHash } from '@/lib/content-library/content-hash';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items to approve' }, { status: 400 });
    }

    const created: { id: string; title: string; type: string; sourceUrl: string | null }[] = [];

    for (const item of items) {
      if (!item.url || !item.title || !item.type) continue;

      // Check if already exists
      const existing = await prisma.contentLibrary.findFirst({
        where: {
          userId: session.user.id,
          sourceUrl: item.url,
          isActive: true,
        },
      });
      if (existing) continue;

      const contentPayload = item.contentPayload || {
        description: item.description || '',
        suggestedType: item.suggestedType || 'Other',
      };
      const contentHash = calculateContentHash(contentPayload);

      const row = await prisma.contentLibrary.create({
        data: {
          userId: session.user.id,
          productId: null,
          title: String(item.title).slice(0, 500),
          type: item.type,
          content: contentPayload,
          contentHash,
          version: '1.0',
          industry: item.industry || null,
          department: item.department || null,
          sourceUrl: item.url,
          userConfirmed: true,
          scrapedAt: new Date(),
        },
        select: { id: true, title: true, type: true, sourceUrl: true },
      });

      // Ingest RAG chunks if markdown is available
      const markdown = (contentPayload as { markdown?: string }).markdown;
      if (markdown) {
        try {
          await ingestContentLibraryChunks(row.id, markdown);
        } catch (e) {
          console.error('RAG ingest failed for', row.id, e);
        }
      }

      created.push(row);
    }

    return NextResponse.json({
      created: created.length,
      items: created,
    });
  } catch (error) {
    console.error('Content library approve error:', error);
    return NextResponse.json(
      { error: 'Approve failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
