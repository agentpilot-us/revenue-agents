import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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

    const activations = await prisma.playbookActivation.findMany({
      where: { roadmapId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            triggerType: true,
            isBuiltIn: true,
            targetDepartmentTypes: true,
            targetIndustries: true,
            targetPersonas: true,
            timingConfig: true,
            expectedOutcome: true,
            priority: true,
            _count: { select: { steps: true } },
          },
        },
      },
      orderBy: { activatedAt: 'desc' },
    });

    return NextResponse.json({ activations });
  } catch (error) {
    console.error('GET /api/roadmap/playbook-activations error:', error);
    return NextResponse.json({ error: 'Failed to list activations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roadmapId, templateId, customConfig } = await req.json();

    if (!roadmapId || !templateId) {
      return NextResponse.json({ error: 'roadmapId and templateId are required' }, { status: 400 });
    }

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
    });
    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const template = await prisma.playbookTemplate.findFirst({
      where: { id: templateId, userId: session.user.id },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const activation = await prisma.playbookActivation.upsert({
      where: { roadmapId_templateId: { roadmapId, templateId } },
      create: {
        roadmapId,
        templateId,
        isActive: true,
        customConfig: customConfig ?? null,
      },
      update: {
        isActive: true,
        customConfig: customConfig ?? undefined,
      },
      include: {
        template: {
          select: { id: true, name: true, triggerType: true },
          include: { _count: { select: { steps: true } } },
        },
      },
    });

    return NextResponse.json({ activation }, { status: 201 });
  } catch (error) {
    console.error('POST /api/roadmap/playbook-activations error:', error);
    return NextResponse.json({ error: 'Failed to activate playbook' }, { status: 500 });
  }
}
