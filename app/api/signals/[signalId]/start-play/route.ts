/**
 * POST /api/signals/[signalId]/start-play
 * Create a PlayRun from this signal (via SignalPlayMapping). If the signal was
 * already acted, returns the existing PlayRun id when one exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { matchSignalToPlayRun } from '@/lib/plays/match-signal-to-play';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> },
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
        companyId: true,
        type: true,
        title: true,
        summary: true,
        relevanceScore: true,
        suggestedPlay: true,
        status: true,
      },
    });

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (signal.status === 'acted') {
      const existing = await prisma.playRun.findFirst({
        where: { accountSignalId: signalId, userId: session.user.id },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ created: false, playRunId: existing.id });
      }
    }

    const result = await matchSignalToPlayRun({
      id: signal.id,
      companyId: signal.companyId,
      userId: session.user.id,
      type: signal.type,
      title: signal.title,
      summary: signal.summary ?? '',
      relevanceScore: signal.relevanceScore ?? 0,
      suggestedPlay: signal.suggestedPlay,
    });

    if (!result.created) {
      return NextResponse.json(
        { error: 'No matching play for this signal', created: false },
        { status: 404 },
      );
    }

    return NextResponse.json({
      created: true,
      playRunId: result.playRunId,
    });
  } catch (error) {
    console.error('POST /api/signals/[signalId]/start-play error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start play' },
      { status: 500 },
    );
  }
}
