/**
 * POST /api/companies/[companyId]/playbooks/steps/[stepId]/skip
 * Mark a playbook run step as skipped; advance to next step.
 */
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _req: Request,
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
      data: { completedAt: now, outcome: { skipped: true } as Prisma.InputJsonValue },
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

  const run = await prisma.playbookRun.findUnique({
    where: { id: runStep.runId },
    include: {
      template: { include: { steps: { orderBy: { order: 'asc' } } } },
      steps: true,
    },
  });

  return NextResponse.json({ run });
}
