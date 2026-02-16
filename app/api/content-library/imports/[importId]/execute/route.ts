import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { executeContentImport } from '@/lib/content-library/execute-import';

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
      select: { id: true, status: true },
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

    const result = await executeContentImport(importId, session.user.id);

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        totalPages: result.totalPages,
        categorizedCount: result.categorizedCount,
      });
    }

    const status = result.error.includes('not in a runnable') ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  } catch (e) {
    console.error('POST content-library/imports/execute', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Execute failed' },
      { status: 500 }
    );
  }
}
