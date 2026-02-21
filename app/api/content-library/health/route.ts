import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  scoreContentLibraryHealth,
  type ContentLibraryItem,
  type StructuredPageExtraction,
} from '@/lib/content-library/structured-extraction';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.contentLibrary.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        archivedAt: null,
      },
      select: {
        type: true,
        userConfirmed: true,
        content: true,
        industry: true,
        department: true,
        sourceUrl: true,
      },
    });

    const items: ContentLibraryItem[] = rows.map((row) => {
      const content = row.content as Record<string, unknown> | null;
      const extraction = content?.extraction as StructuredPageExtraction | undefined;
      return {
        type: row.type,
        userConfirmed: row.userConfirmed,
        extraction,
        content: content ?? undefined,
        industry: row.industry ?? undefined,
        department: row.department ?? undefined,
      };
    });

    let productUrl: string | undefined;
    const firstWithUrl = rows.find((r) => r.sourceUrl);
    if (firstWithUrl?.sourceUrl) {
      try {
        productUrl = new URL(firstWithUrl.sourceUrl).origin;
      } catch {
        productUrl = undefined;
      }
    }

    const health = scoreContentLibraryHealth(items, productUrl);

    return NextResponse.json(health);
  } catch (error) {
    console.error('Content library health error:', error);
    return NextResponse.json(
      { error: 'Failed to compute health', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
