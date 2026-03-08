import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';
import { resolveTemplateForContext } from '@/lib/action-workflows/resolve-template';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const workflows = await prisma.actionWorkflow.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, industry: true } },
        template: { select: { id: true, name: true, triggerType: true } },
        accountSignal: { select: { id: true, title: true, type: true } },
        targetDivision: { select: { id: true, customName: true, type: true } },
        targetContact: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        steps: { orderBy: { stepOrder: 'asc' }, select: { id: true, status: true, stepType: true } },
      },
      orderBy: [{ urgencyScore: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('GET /api/action-workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyId,
      templateId: rawTemplateId,
      roadmapPlanId,
      accountSignalId,
      targetDivisionId,
      targetContactId,
      title,
      description,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 },
      );
    }

    let templateId = rawTemplateId;

    // Unified template resolution via shared resolver
    if (!templateId) {
      let signalType: string | undefined;
      if (accountSignalId) {
        const signal = await prisma.accountSignal.findUnique({
          where: { id: accountSignalId },
          select: { type: true },
        });
        signalType = signal?.type;
      }

      templateId = await resolveTemplateForContext({
        userId: session.user.id,
        companyId,
        signalType,
        signalId: accountSignalId,
        roadmapPlanId,
      });
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'No playbook template available. Create one first.' },
        { status: 400 },
      );
    }

    const workflow = await assembleWorkflow({
      userId: session.user.id,
      companyId,
      templateId,
      roadmapPlanId,
      accountSignalId,
      targetDivisionId,
      targetContactId,
      title,
      description,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('POST /api/action-workflows error:', error);
    const err = error as Error & { code?: string; existingWorkflowId?: string };
    if (err.code === 'DUPLICATE_ENROLLMENT') {
      return NextResponse.json(
        { error: err.message, existingWorkflowId: err.existingWorkflowId },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workflow' },
      { status: 500 },
    );
  }
}
