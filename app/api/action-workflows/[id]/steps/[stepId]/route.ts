import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, stepId } = await params;
    const body = await req.json();

    const workflow = await prisma.actionWorkflow.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!workflow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.editedContent !== undefined) {
      data.editedContent = body.editedContent;
      data.status = 'ready';
    }

    if (body.status === 'skipped') {
      data.status = 'skipped';
      data.completedAt = new Date();
    }

    if (body.contactId !== undefined) {
      data.contactId = body.contactId || null;
    }

    if (body.divisionId !== undefined) {
      data.divisionId = body.divisionId || null;
    }

    const step = await prisma.actionWorkflowStep.update({
      where: { id: stepId },
      data,
    });

    return NextResponse.json({ step });
  } catch (error) {
    console.error('PATCH /api/action-workflows/[id]/steps/[stepId] error:', error);
    return NextResponse.json(
      { error: 'Failed to update step' },
      { status: 500 },
    );
  }
}
