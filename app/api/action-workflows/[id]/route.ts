import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { resolveTargetingSuggestion } from '@/lib/action-workflows/resolve-targeting';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await prisma.actionWorkflow.findFirst({
      where: { id, userId: session.user.id },
      include: {
        company: {
          select: { id: true, name: true, industry: true, domain: true },
        },
        template: { select: { id: true, name: true, triggerType: true } },
        accountSignal: true,
        targetDivision: {
          select: { id: true, customName: true, type: true },
        },
        targetContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            linkedinUrl: true,
          },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true,
                email: true,
                linkedinUrl: true,
              },
            },
            division: {
              select: { id: true, customName: true, type: true },
            },
            activity: {
              select: { id: true, type: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let suggestedTargeting = null;
    const hasTargeting = !!workflow.targetContactId;
    if (!hasTargeting) {
      try {
        suggestedTargeting = await resolveTargetingSuggestion({
          templateId: workflow.templateId,
          companyId: workflow.companyId,
          accountSignalId: workflow.accountSignalId,
          userId: session.user.id,
          workflowTitle: workflow.title,
          workflowDescription: workflow.description,
        });
      } catch (err) {
        console.error('Targeting suggestion failed (non-fatal):', err);
      }
    }

    return NextResponse.json({ workflow, suggestedTargeting });
  } catch (error) {
    console.error('GET /api/action-workflows/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, dismissReason, snoozeUntil, outcome, outcomeNote } = body;

    const existing = await prisma.actionWorkflow.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (dismissReason) data.dismissReason = dismissReason;
    if (snoozeUntil) data.snoozeUntil = new Date(snoozeUntil);
    if (status === 'completed') data.completedAt = new Date();
    if (outcome) {
      data.outcome = outcome;
      data.outcomeAt = new Date();
      if (!status) {
        data.status = 'completed';
        data.completedAt = new Date();
      }
    }
    if (outcomeNote !== undefined) data.outcomeNote = outcomeNote;

    const updated = await prisma.actionWorkflow.update({
      where: { id },
      data,
    });

    return NextResponse.json({ workflow: updated });
  } catch (error) {
    console.error('PATCH /api/action-workflows/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 },
    );
  }
}
