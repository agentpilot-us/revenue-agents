import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workflowId, name, description } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    const workflow = await prisma.actionWorkflow.findFirst({
      where: { id: workflowId, userId: session.user.id },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        targetDivision: {
          select: { type: true, customName: true, industry: true, segmentType: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const division = workflow.targetDivision;
    const targetDepartmentTypes = division?.type ? [division.type] : undefined;
    const targetIndustries = division?.industry ? [division.industry] : undefined;

    const template = await prisma.playbookTemplate.create({
      data: {
        userId: session.user.id,
        name: name || workflow.title,
        description: description || workflow.description || null,
        triggerType: 'manual',
        isBuiltIn: false,
        isDefault: false,
        targetDepartmentTypes: targetDepartmentTypes ?? undefined,
        targetIndustries: targetIndustries ?? undefined,
        steps: {
          create: workflow.steps.map((step) => ({
            order: step.stepOrder,
            label: step.promptHint?.slice(0, 100) || null,
            name: step.promptHint?.slice(0, 200) || step.contentType || step.stepType,
            description: step.promptHint || null,
            channel: step.channel || step.contentType || null,
            promptHint: step.promptHint || null,
          })),
        },
      },
      include: { _count: { select: { steps: true } } },
    });

    return NextResponse.json({
      templateId: template.id,
      name: template.name,
      stepCount: template._count.steps,
    });
  } catch (err) {
    console.error('[from-workflow] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
