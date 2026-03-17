import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { executePlayAction } from '@/lib/plays/execute-action';

/**
 * POST /api/play-runs/[runId]/actions/[actionId]/execute
 * Execute a PlayAction: create Activity, ContactTouch, mark action executed,
 * and advance phase gate / next phase when applicable.
 * Body: { subject?, body?, contactId? } (optional overrides)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; actionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, actionId } = await params;
    const body = await req.json().catch(() => ({}));
    const { subject, body: contentBody, contactId } = body;

    const link = await prisma.playAction.findFirst({
      where: { id: actionId },
      select: {
        phaseRun: {
          select: { playRunId: true, playRun: { select: { userId: true } } },
        },
      },
    });
    if (
      !link ||
      link.phaseRun.playRunId !== runId ||
      link.phaseRun.playRun.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Action not found or not in this run' },
        { status: 404 },
      );
    }

    const result = await executePlayAction({
      actionId,
      userId: session.user.id,
      subject: subject ?? undefined,
      body: contentBody ?? undefined,
      contactId: contactId ?? undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Execution failed' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      activityId: result.activityId,
      contactTouchId: result.contactTouchId,
    });
  } catch (error) {
    console.error(
      'POST /api/play-runs/[runId]/actions/[actionId]/execute error:',
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to execute action',
      },
      { status: 500 },
    );
  }
}
