import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET  /api/account-campaigns?companyId=xxx — list campaigns for a company
 * POST /api/account-campaigns — create a new campaign (optionally with templateIds to auto-spawn workflows)
 */

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = req.nextUrl.searchParams.get('companyId');

    const campaigns = await prisma.accountCampaign.findMany({
      where: {
        userId: session.user.id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: { select: { id: true, name: true, industry: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      campaigns: campaigns.map((c) => ({ ...c, workflows: [] as unknown[] })),
    });
  } catch (error) {
    console.error('GET /api/account-campaigns error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId, name, description, motion, templateIds, divisionIds } = body as {
      companyId: string;
      name: string;
      description?: string;
      motion?: string;
      templateIds?: string[];
      divisionIds?: string[];
    };

    if (!companyId || !name) {
      return NextResponse.json({ error: 'companyId and name are required' }, { status: 400 });
    }

    const campaign = await prisma.accountCampaign.create({
      data: {
        userId: session.user.id,
        companyId,
        name,
        description: description || undefined,
        motion: motion || 'acquisition',
        status: 'active',
        phase: 'prep',
      },
    });

    // Auto-spawn PlayRuns from templateIds (PlayTemplate IDs). One run per template.
    let playRunsCreated = 0;
    if (templateIds && templateIds.length > 0) {
      const { createPlayRunFromTemplate } = await import('@/lib/plays/create-play-run');
      for (const playTemplateId of templateIds) {
        try {
          await createPlayRunFromTemplate({
            userId: session.user.id,
            companyId,
            playTemplateId,
          });
          playRunsCreated++;
        } catch (err) {
          console.error(`Failed to create play run for template ${playTemplateId}:`, err);
        }
      }
    }

    const full = await prisma.accountCampaign.findUnique({
      where: { id: campaign.id },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { campaign: full ? { ...full, workflows: [] } : full, playRunsCreated, workflowsCreated: 0 },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/account-campaigns error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
