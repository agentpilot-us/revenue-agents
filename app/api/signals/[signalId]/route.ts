/**
 * GET /api/signals/[signalId]
 * Returns signal data for Content tab context (Spec 1 / Spec 3).
 * Used when ?signal= is in the URL so the Content tab can show "Generating based on signal: …"
 * and pass context into the generate request.
 * Response: summary, source (type + url), confidence (relevanceScore), matched division (id + name when resolved).
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { resolveDivisionForSignal } from '@/lib/signals/division-resolution';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signalId } = await params;
    const signal = await prisma.accountSignal.findFirst({
      where: { id: signalId, userId: session.user.id },
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        url: true,
        publishedAt: true,
        relevanceScore: true,
        companyId: true,
      },
    });

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    const { division } = await resolveDivisionForSignal({
      userId: session.user.id,
      companyId: signal.companyId,
      signalTitle: signal.title,
      signalSummary: signal.summary,
    });

    return NextResponse.json({
      id: signal.id,
      summary: signal.summary,
      title: signal.title,
      source: {
        type: signal.type,
        url: signal.url,
      },
      confidence: signal.relevanceScore / 10,
      publishedAt: signal.publishedAt.toISOString(),
      division,
    });
  } catch (error) {
    console.error('GET /api/signals/[signalId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load signal' },
      { status: 500 }
    );
  }
}
