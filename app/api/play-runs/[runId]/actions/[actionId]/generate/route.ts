import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generatePlayActionContent } from '@/lib/plays/generate-action-content';

export const maxDuration = 120;

/**
 * POST /api/play-runs/[runId]/actions/[actionId]/generate
 * Generate content for a PlayAction using its ContentTemplate.
 * Updates the action and creates a ContentGenerationLog.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string; actionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, actionId } = await params;

    const link = await prisma.playAction.findFirst({
      where: { id: actionId },
      select: { phaseRun: { select: { playRunId: true, playRun: { select: { userId: true } } } } },
    });
    if (!link || link.phaseRun.playRunId !== runId || link.phaseRun.playRun.userId !== session.user.id) {
      return NextResponse.json({ error: 'Action not found or not in this run' }, { status: 404 });
    }

    const action = await generatePlayActionContent({
      actionId,
      userId: session.user.id,
    });

    return NextResponse.json({ action });
  } catch (error) {
    console.error('POST /api/play-runs/[runId]/actions/[actionId]/generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
