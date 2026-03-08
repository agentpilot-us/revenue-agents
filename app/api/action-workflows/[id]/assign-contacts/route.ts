import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * Bulk-assign contacts (and optionally a division) to all pending steps in a workflow.
 * Body: { contactIds: string[], divisionId?: string }
 *
 * Each step that has no contact yet gets a contact assigned round-robin from the
 * provided list. If a single contact is provided, all steps get that contact.
 * Also sets targetContactId on the workflow itself (first contact).
 */
export async function POST(
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
    const { contactIds, divisionId } = body as {
      contactIds: string[];
      divisionId?: string;
    };

    if (!contactIds || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one contactId is required' },
        { status: 400 },
      );
    }

    const workflow = await prisma.actionWorkflow.findFirst({
      where: { id, userId: session.user.id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!workflow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const stepsToAssign = workflow.steps.filter(
      (s) => s.status === 'pending' || s.status === 'failed',
    );

    const updates = stepsToAssign.map((step, idx) => {
      const contactId = contactIds[idx % contactIds.length];
      return prisma.actionWorkflowStep.update({
        where: { id: step.id },
        data: {
          contactId,
          ...(divisionId ? { divisionId } : {}),
        },
      });
    });

    const workflowUpdate = prisma.actionWorkflow.update({
      where: { id },
      data: {
        targetContactId: contactIds[0],
        ...(divisionId ? { targetDivisionId: divisionId } : {}),
      },
    });

    await prisma.$transaction([...updates, workflowUpdate]);

    const updated = await prisma.actionWorkflow.findFirst({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, industry: true, domain: true },
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
        targetDivision: {
          select: { id: true, customName: true, type: true },
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

    return NextResponse.json({
      workflow: updated,
      assignedSteps: stepsToAssign.length,
    });
  } catch (error) {
    console.error('POST /api/action-workflows/[id]/assign-contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to assign contacts' },
      { status: 500 },
    );
  }
}
