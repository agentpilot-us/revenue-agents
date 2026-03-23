import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { applyCooldownToPlayRun } from '@/lib/plays/cooldown-check';
import { DEMO_STEP_1_BODY } from '@/app/api/demo/run-play/route';

/**
 * PATCH /api/play-runs/[runId]
 * Update run status (e.g. PROPOSED → ACTIVE or DISMISSED).
 */
export async function PATCH(
  req: NextRequest,
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
      select: { id: true, status: true },
    });
    if (!run) {
      return NextResponse.json({ error: 'Play run not found' }, { status: 404 });
    }
    const body = await req.json();
    const status = body.status as string | undefined;
    const outcome = body.outcome as string | undefined;
    const outcomeNote = body.outcomeNote as string | undefined;

    if (status && ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'PROPOSED', 'DISMISSED'].includes(status)) {
      const data: {
        status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'PROPOSED' | 'DISMISSED';
        triggerContext?: object;
      } = { status: status as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'PROPOSED' | 'DISMISSED' };

      if (outcome != null || outcomeNote != null) {
        const existing = await prisma.playRun.findFirst({
          where: { id: runId, userId: session.user.id },
          select: { triggerContext: true },
        });
        const prev =
          existing?.triggerContext != null && typeof existing.triggerContext === 'object' && !Array.isArray(existing.triggerContext)
            ? (existing.triggerContext as Record<string, unknown>)
            : {};
        data.triggerContext = {
          ...prev,
          ...(outcome != null ? { dismissOutcome: outcome } : {}),
          ...(outcomeNote != null && outcomeNote !== '' ? { dismissOutcomeNote: outcomeNote } : {}),
        };
      }

      await prisma.playRun.update({
        where: { id: runId },
        data,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/play-runs/[runId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update run' },
      { status: 500 },
    );
  }
}

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
              orderBy: [{ suggestedDate: 'asc' }, { createdAt: 'asc' }],
              include: {
                contentTemplate: {
                  select: {
                    id: true,
                    name: true,
                    contentType: true,
                    channel: true,
                    contentGenerationType: true,
                  },
                },
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

    // Demo bypass runs: show current step 1 body so existing runs reflect latest copy
    const ctx = playRun.triggerContext as { demoBypass?: boolean } | null;
    if (ctx?.demoBypass && phaseRuns[0]?.actions?.length) {
      const first = phaseRuns[0].actions[0];
      if (first?.actionType === 'REVIEW_BRIEF') {
        first.generatedContent = DEMO_STEP_1_BODY;
      }
    }

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
