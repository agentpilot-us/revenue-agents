import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await params;
    const play = await prisma.stakeholderEngagementPlay.findFirst({
      where: { id: runId },
      include: { company: { select: { userId: true } } },
    });
    if (!play || play.company.userId !== session.user.id) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    const body = await req.json();

    const updates: Record<string, unknown> = {};

    if (body.draftEmail !== undefined) {
      updates.draftEmail = body.draftEmail;
    }
    if (typeof body.draftEmailApproved === 'boolean') {
      updates.draftEmailApproved = body.draftEmailApproved;
    }
    if (typeof body.currentStep === 'number' && body.currentStep >= 1 && body.currentStep <= 5) {
      updates.currentStep = body.currentStep;
    }
    if (body.stepState !== undefined && typeof body.stepState === 'object') {
      updates.stepState = body.stepState;
    }
    if (body.stepCompletedAt !== undefined && typeof body.stepCompletedAt === 'object') {
      updates.stepCompletedAt = body.stepCompletedAt;
    }
    if (typeof body.playState === 'string' && ['running', 'waiting_for_user', 'waiting_for_time', 'paused', 'completed', 'cancelled'].includes(body.playState)) {
      updates.playState = body.playState;
    }
    if (body.messages !== undefined && Array.isArray(body.messages)) {
      updates.messages = body.messages;
    }
    if (body.draftAttachment !== undefined) {
      updates.draftAttachment = body.draftAttachment === null ? null : String(body.draftAttachment);
    }

    if (body.skipStep !== undefined) {
      const stepIndex = Number(body.skipStep);
      if (stepIndex >= 1 && stepIndex <= 5) {
        const stepCompletedAt = { ...((play.stepCompletedAt as Record<string, string>) ?? {}) };
        stepCompletedAt[String(stepIndex)] = new Date().toISOString();
        updates.stepCompletedAt = stepCompletedAt;
        const stepState = { ...((play.stepState as Record<string, string>) ?? {}) };
        stepState[String(stepIndex)] = 'skipped';
        updates.stepState = stepState;
        if (stepIndex === play.currentStep) {
          updates.currentStep = Math.min(5, play.currentStep + 1);
        }
      }
    }

    if (body.markStepComplete !== undefined) {
      const stepIndex = Number(body.markStepComplete);
      if (stepIndex >= 1 && stepIndex <= 5) {
        const stepCompletedAt = { ...((play.stepCompletedAt as Record<string, string>) ?? {}) };
        stepCompletedAt[String(stepIndex)] = new Date().toISOString();
        updates.stepCompletedAt = stepCompletedAt;
        const stepState = { ...((play.stepState as Record<string, string>) ?? {}) };
        stepState[String(stepIndex)] = 'completed';
        updates.stepState = stepState;
        if (stepIndex === play.currentStep) {
          updates.currentStep = Math.min(5, play.currentStep + 1);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(play);
    }

    const updated = await prisma.stakeholderEngagementPlay.update({
      where: { id: runId },
      data: updates as Record<string, unknown>,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Play PATCH error:', error);
    return NextResponse.json(
      { error: 'Update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
