import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { applyCooldownToPlayRun } from '@/lib/plays/cooldown-check';

/**
 * GET /api/play-runs/[runId]
 * Load a play run with phases and actions. Runs cooldown check so actions
 * have cooldownWarning and alternateContact set when over limits.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await params;

    const run = await prisma.playRun.findFirst({
      where: { id: runId, userId: session.user.id },
      select: { id: true },
    });
    if (!run) {
      return NextResponse.json({ error: 'Play run not found' }, { status: 404 });
    }

    await applyCooldownToPlayRun(runId, session.user.id);

    const playRun = await prisma.playRun.findUnique({
      where: { id: runId },
      include: {
        playTemplate: { select: { id: true, name: true, slug: true } },
        company: { select: { id: true, name: true } },
        phaseRuns: {
          include: {
            phaseTemplate: { select: { id: true, name: true, orderIndex: true, gateType: true } },
            actions: {
              include: {
                contentTemplate: { select: { id: true, name: true, contentType: true } },
              },
            },
          },
        },
      },
    });

    if (!playRun) {
      return NextResponse.json({ error: 'Play run not found' }, { status: 404 });
    }

    const phaseRuns = playRun.phaseRuns.sort(
      (a, b) => a.phaseTemplate.orderIndex - b.phaseTemplate.orderIndex,
    );

    return NextResponse.json({
      playRun: { ...playRun, phaseRuns },
    });
  } catch (error) {
    console.error('GET /api/play-runs/[runId] error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to load play run',
      },
      { status: 500 },
    );
  }
}
