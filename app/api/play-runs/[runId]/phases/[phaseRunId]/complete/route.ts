import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { completePhaseAndAdvance } from '@/lib/plays/execute-action';

/**
 * POST /api/play-runs/[runId]/phases/[phaseRunId]/complete
 * Manually complete a phase (MANUAL gate). All actions in the phase must be EXECUTED or SKIPPED.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string; phaseRunId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, phaseRunId } = await params;

    const phaseRun = await prisma.playPhaseRun.findUnique({
      where: { id: phaseRunId },
      include: {
        playRun: { select: { id: true, userId: true } },
        phaseTemplate: { select: { gateType: true } },
        actions: { select: { status: true } },
      },
    });

    if (
      !phaseRun ||
      phaseRun.playRunId !== runId ||
      phaseRun.playRun.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    if (phaseRun.phaseTemplate.gateType !== 'MANUAL') {
      return NextResponse.json(
        { error: 'Phase is not a MANUAL gate; use normal flow to complete' },
        { status: 400 },
      );
    }

    const allDone = phaseRun.actions.every(
      (a) => a.status === 'EXECUTED' || a.status === 'SKIPPED',
    );
    if (!allDone) {
      return NextResponse.json(
        { error: 'Complete or skip all actions in this phase first' },
        { status: 400 },
      );
    }

    await completePhaseAndAdvance(phaseRunId, runId, session.user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST play-runs/.../phases/.../complete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete phase' },
      { status: 500 },
    );
  }
}
