import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/roadmap/account-play-activations?roadmapId=...
 * List AccountPlayActivation (new play system) for a roadmap.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roadmapId = req.nextUrl.searchParams.get('roadmapId');
    if (!roadmapId) {
      return NextResponse.json({ error: 'roadmapId is required' }, { status: 400 });
    }

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      select: { id: true },
    });
    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const activations = await prisma.accountPlayActivation.findMany({
      where: { roadmapId },
      include: {
        playTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
            slug: true,
            category: true,
            triggerType: true,
            _count: { select: { phases: true } },
          },
        },
      },
      orderBy: { activatedAt: 'desc' },
    });

    const list = activations.map((a) => {
      const { _count, ...playTemplateRest } = a.playTemplate;
      return {
        id: a.id,
        roadmapId: a.roadmapId,
        playTemplateId: a.playTemplateId,
        isActive: a.isActive,
        customConfig: a.customConfig,
        activatedAt: a.activatedAt.toISOString(),
        playTemplate: { ...playTemplateRest, phaseCount: _count.phases },
      };
    });

    return NextResponse.json({ activations: list });
  } catch (error) {
    console.error('GET /api/roadmap/account-play-activations error:', error);
    return NextResponse.json(
      { error: 'Failed to list account play activations' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/roadmap/account-play-activations
 * Create or reactivate AccountPlayActivation for a roadmap + PlayTemplate.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { roadmapId, playTemplateId, customConfig } = body;

    if (!roadmapId || !playTemplateId) {
      return NextResponse.json(
        { error: 'roadmapId and playTemplateId are required' },
        { status: 400 },
      );
    }

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      select: { id: true },
    });
    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const playTemplate = await prisma.playTemplate.findFirst({
      where: { id: playTemplateId, userId: session.user.id },
      select: { id: true },
    });
    if (!playTemplate) {
      return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
    }

    const activation = await prisma.accountPlayActivation.upsert({
      where: {
        roadmapId_playTemplateId: { roadmapId, playTemplateId },
      },
      create: {
        roadmapId,
        playTemplateId,
        isActive: true,
        customConfig: customConfig ?? undefined,
      },
      update: {
        isActive: true,
        customConfig: customConfig ?? undefined,
      },
      include: {
        playTemplate: {
          select: {
            id: true,
            name: true,
            slug: true,
            triggerType: true,
            _count: { select: { phases: true } },
          },
        },
      },
    });

    const { _count, ...playTemplateRest } = activation.playTemplate;
    return NextResponse.json({
      activation: {
        ...activation,
        playTemplate: { ...playTemplateRest, phaseCount: _count.phases },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/roadmap/account-play-activations error:', error);
    return NextResponse.json(
      { error: 'Failed to create account play activation' },
      { status: 500 },
    );
  }
}
