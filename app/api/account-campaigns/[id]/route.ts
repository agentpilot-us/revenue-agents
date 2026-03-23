import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET   /api/account-campaigns/[id] — campaign + PlayRun stats for the account
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
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const playRuns = await prisma.playRun.findMany({
      where: { companyId: campaign.companyId, userId: session.user.id },
      select: {
        id: true,
        status: true,
        playTemplate: { select: { id: true, name: true } },
        triggerContext: true,
        phaseRuns: { select: { id: true, status: true } },
      },
      orderBy: { activatedAt: 'desc' },
      take: 50,
    });

    const threads = playRuns.length;
    const completedThreads = playRuns.filter((r) => r.status === 'COMPLETED').length;
    const totalSteps = playRuns.reduce((sum, r) => sum + r.phaseRuns.length, 0);
    const completedSteps = playRuns.reduce(
      (sum, r) => sum + r.phaseRuns.filter((p) => p.status === 'COMPLETED').length,
      0,
    );

    const outcomes = playRuns
      .map((r) => {
        const ctx = r.triggerContext as Record<string, unknown> | null;
        const o = ctx?.dismissOutcome;
        return typeof o === 'string' ? { playRunId: r.id, outcome: o } : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      campaign: { ...campaign, workflows: [] },
      playRuns,
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
