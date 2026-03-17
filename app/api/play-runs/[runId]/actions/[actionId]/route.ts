import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * PATCH /api/play-runs/[runId]/actions/[actionId]
 * Update a PlayAction (e.g. skip, or set edited content).
 * Body: { status?: 'SKIPPED', skipReason?: string, editedContent?: string, editedSubject?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; actionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, actionId } = await params;
    const body = await req.json();

    const link = await prisma.playAction.findFirst({
      where: { id: actionId },
      select: {
        contentTemplateId: true,
        phaseRun: { select: { playRunId: true, playRun: { select: { userId: true } } } },
      },
    });
    if (
      !link ||
      link.phaseRun.playRunId !== runId ||
      link.phaseRun.playRun.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const data: {
      status?: 'SKIPPED';
      skippedAt?: Date;
      skipReason?: string | null;
      editedContent?: string | null;
      editedSubject?: string | null;
      reviewedAt?: Date;
    } = {};

    if (body.status === 'SKIPPED') {
      data.status = 'SKIPPED';
      data.skippedAt = new Date();
      data.skipReason = body.skipReason ?? null;
    }
    if (body.editedContent !== undefined) {
      data.editedContent = body.editedContent ?? null;
      data.reviewedAt = new Date();
    }
    if (body.editedSubject !== undefined) {
      data.editedSubject = body.editedSubject ?? null;
    }

    const action = await prisma.playAction.update({
      where: { id: actionId },
      data,
    });

    if (link.contentTemplateId && (data.editedContent !== undefined || data.editedSubject !== undefined)) {
      await prisma.contentTemplate
        .update({
          where: { id: link.contentTemplateId },
          data: { timesEdited: { increment: 1 } },
        })
        .catch(() => {});
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('PATCH /api/play-runs/[runId]/actions/[actionId] error:', error);
    return NextResponse.json(
      { error: 'Failed to update action' },
      { status: 500 },
    );
  }
}
