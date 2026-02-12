import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ playId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playId } = await params;
    const play = await prisma.useCaseExplorationPlay.findFirst({
      where: { id: playId },
      include: { company: { select: { userId: true } } },
    });
    if (!play || play.company.userId !== session.user.id) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.currentStep === 'number' && body.currentStep >= 1 && body.currentStep <= 4) {
      updates.currentStep = body.currentStep;
    }
    if (body.stepState !== undefined && typeof body.stepState === 'object') {
      updates.stepState = body.stepState;
    }
    if (body.stepCompletedAt !== undefined && typeof body.stepCompletedAt === 'object') {
      updates.stepCompletedAt = body.stepCompletedAt;
    }
    if (
      typeof body.playState === 'string' &&
      ['running', 'waiting_for_user', 'paused', 'completed', 'cancelled'].includes(body.playState)
    ) {
      updates.playState = body.playState;
    }
    if (body.targetContactIds !== undefined && Array.isArray(body.targetContactIds)) {
      updates.targetContactIds = body.targetContactIds;
    }
    if (body.drafts !== undefined && Array.isArray(body.drafts)) {
      updates.drafts = body.drafts;
    }
    if (body.eventIntent !== undefined && typeof body.eventIntent === 'object') {
      updates.eventIntent = body.eventIntent;
    }

    if (body.completeStep !== undefined) {
      const stepIndex = Number(body.completeStep);
      if (stepIndex >= 1 && stepIndex <= 4) {
        const stepCompletedAt = { ...((play.stepCompletedAt as Record<string, string>) ?? {}) };
        stepCompletedAt[String(stepIndex)] = new Date().toISOString();
        updates.stepCompletedAt = stepCompletedAt;
        const stepState = { ...((play.stepState as Record<string, string>) ?? {}) };
        stepState[String(stepIndex)] = 'completed';
        updates.stepState = stepState;
        if (stepIndex === play.currentStep) {
          updates.currentStep = Math.min(4, play.currentStep + 1);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(play);
    }

    const updated = await prisma.useCaseExplorationPlay.update({
      where: { id: playId },
      data: updates as Record<string, unknown>,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Use Case Exploration PATCH error:', error);
    return NextResponse.json(
      {
        error: 'Update failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
