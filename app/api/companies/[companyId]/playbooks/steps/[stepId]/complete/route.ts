/**
 * POST /api/companies/[companyId]/playbooks/steps/[stepId]/complete
 * Mark a playbook run step as complete (with optional outcome).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId, stepId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: { outcome?: Record<string, unknown>; notes?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const notes = typeof body.notes === 'string' ? body.notes : (body.outcome?.notes as string) ?? '';
  const outcome = body.outcome ?? (notes ? { notes } : undefined);

  const runStep = await prisma.playbookRunStep.findUnique({
    where: { id: stepId },
    include: {
      run: {
        include: {
          template: { include: { steps: { orderBy: { order: 'asc' } } } },
        },
      },
    },
  });

  if (!runStep || runStep.run.companyId !== companyId) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  const now = new Date();
  const stepCompletedAt = (runStep.run.stepCompletedAt as Record<string, string>) ?? {};
  stepCompletedAt[String(runStep.stepOrder)] = now.toISOString();

  await prisma.$transaction([
    prisma.playbookRunStep.update({
      where: { id: stepId },
      data: { completedAt: now, outcome: outcome ?? undefined },
    }),
    prisma.playbookRun.update({
      where: { id: runStep.runId },
      data: {
        currentStep: runStep.stepOrder + 1,
        stepCompletedAt,
        ...(runStep.run.template.steps.length <= runStep.stepOrder
          ? { status: 'completed', completedAt: now }
          : {}),
      },
    }),
  ]);

  await prisma.activity
    .create({
      data: {
        companyId,
        userId: session.user.id,
        type: 'PLAYBOOK_STEP_COMPLETED',
        summary: `Playbook step completed: step ${runStep.stepOrder}`,
        metadata: { stepRunId: stepId, notes, playbookRunId: runStep.runId },
      },
    })
    .catch(() => {});

  const run = await prisma.playbookRun.findUnique({
    where: { id: runStep.runId },
    include: {
      template: { include: { steps: { orderBy: { order: 'asc' } } } },
      steps: true,
    },
  });

  return NextResponse.json({ success: true, run });
}
