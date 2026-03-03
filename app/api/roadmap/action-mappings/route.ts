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

    const mappings = await prisma.roadmapActionMapping.findMany({
      where: { roadmapId },
      include: { signalRule: { select: { id: true, name: true, category: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('GET /api/roadmap/action-mappings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list mappings' },
      { status: 500 }
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
    const { roadmapId, signalCategory, actionType, autonomyLevel, promptHint, signalRuleId } = body;

    if (!roadmapId || !actionType) {
      return NextResponse.json(
        { error: 'roadmapId and actionType are required' },
        { status: 400 }
      );
    }

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      select: { id: true },
    });
    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const created = await prisma.roadmapActionMapping.create({
      data: {
        roadmapId,
        signalCategory: signalCategory ?? null,
        actionType,
        autonomyLevel: autonomyLevel ?? 'draft_review',
        promptHint: promptHint ?? null,
        signalRuleId: signalRuleId ?? null,
      },
    });

    return NextResponse.json({ mapping: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/roadmap/action-mappings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create mapping' },
      { status: 500 }
    );
  }
}
