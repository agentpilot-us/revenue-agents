import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/signal-play-mappings
 * List SignalPlayMapping for the current user (signal type → PlayTemplate).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mappings = await prisma.signalPlayMapping.findMany({
      where: { userId: session.user.id },
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
      orderBy: [{ signalType: 'asc' }, { createdAt: 'asc' }],
    });

    const list = mappings.map((m) => {
      const { _count, ...playTemplateRest } = m.playTemplate;
      return {
        id: m.id,
        signalType: m.signalType,
        signalSource: m.signalSource,
        playTemplateId: m.playTemplateId,
        autoActivate: m.autoActivate,
        priority: m.priority,
        playTemplate: { ...playTemplateRest, phaseCount: _count.phases },
        createdAt: m.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ mappings: list });
  } catch (error) {
    console.error('GET /api/signal-play-mappings error:', error);
    return NextResponse.json(
      { error: 'Failed to list signal play mappings' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/signal-play-mappings
 * Create a SignalPlayMapping: when signalType fires, use playTemplateId.
 * Body: { signalType, playTemplateId, priority?, autoActivate? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { signalType, playTemplateId, priority, autoActivate } = body;

    if (!signalType || typeof signalType !== 'string' || !signalType.trim()) {
      return NextResponse.json(
        { error: 'signalType is required' },
        { status: 400 },
      );
    }
    if (!playTemplateId) {
      return NextResponse.json(
        { error: 'playTemplateId is required' },
        { status: 400 },
      );
    }

    const playTemplate = await prisma.playTemplate.findFirst({
      where: { id: playTemplateId, userId: session.user.id, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!playTemplate) {
      return NextResponse.json({ error: 'Play template not found or not active' }, { status: 404 });
    }

    const validPriorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    const priorityValue = validPriorities.includes(priority) ? priority : 'MEDIUM';

    const mapping = await prisma.signalPlayMapping.upsert({
      where: {
        userId_signalType_playTemplateId: {
          userId: session.user.id,
          signalType: signalType.trim(),
          playTemplateId,
        },
      },
      create: {
        userId: session.user.id,
        signalType: signalType.trim(),
        playTemplateId,
        priority: priorityValue,
        autoActivate: Boolean(autoActivate),
      },
      update: {
        priority: priorityValue,
        autoActivate: Boolean(autoActivate),
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

    const { _count, ...playTemplateRest } = mapping.playTemplate;
    return NextResponse.json({
      mapping: {
        ...mapping,
        playTemplate: { ...playTemplateRest, phaseCount: _count.phases },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/signal-play-mappings error:', error);
    return NextResponse.json(
      { error: 'Failed to create signal play mapping' },
      { status: 500 },
    );
  }
}
