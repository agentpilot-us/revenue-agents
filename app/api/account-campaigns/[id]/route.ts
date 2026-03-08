import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET   /api/account-campaigns/[id] — full campaign detail with workflows
 * PATCH /api/account-campaigns/[id] — update campaign status, phase, name
 */

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

    const campaign = await prisma.accountCampaign.findFirst({
      where: { id, userId: session.user.id },
      include: {
        company: { select: { id: true, name: true, industry: true, domain: true } },
        workflows: {
          orderBy: { createdAt: 'asc' },
          include: {
            template: { select: { id: true, name: true, triggerType: true } },
            targetDivision: { select: { id: true, customName: true, type: true } },
            targetContact: {
              select: { id: true, firstName: true, lastName: true, title: true, email: true },
            },
            accountSignal: { select: { id: true, title: true, type: true } },
            steps: {
              orderBy: { stepOrder: 'asc' },
              select: {
                id: true,
                stepOrder: true,
                stepType: true,
                contentType: true,
                channel: true,
                status: true,
                dueAt: true,
                completedAt: true,
                contact: {
                  select: { id: true, firstName: true, lastName: true, title: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Compute campaign-level stats
    const threads = campaign.workflows.length;
    const completedThreads = campaign.workflows.filter((w) => w.status === 'completed').length;
    const totalSteps = campaign.workflows.reduce((sum, w) => sum + w.steps.length, 0);
    const completedSteps = campaign.workflows.reduce(
      (sum, w) => sum + w.steps.filter((s) => s.status === 'sent' || s.status === 'skipped').length,
      0,
    );
    const outcomes = campaign.workflows
      .filter((w) => w.outcome)
      .map((w) => ({ workflowId: w.id, outcome: w.outcome, divisionName: w.targetDivision?.customName ?? w.targetDivision?.type }));

    return NextResponse.json({
      campaign,
      stats: { threads, completedThreads, totalSteps, completedSteps, outcomes },
    });
  } catch (error) {
    console.error('GET /api/account-campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
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
    const { status, phase, name, description } = body as {
      status?: string;
      phase?: string;
      name?: string;
      description?: string;
    };

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (phase) data.phase = phase;
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (status === 'completed') data.completedAt = new Date();

    const updated = await prisma.accountCampaign.update({
      where: { id },
      data,
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('PATCH /api/account-campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}
