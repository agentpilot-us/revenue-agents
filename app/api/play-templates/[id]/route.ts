import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/play-templates/[id]
 * Fetch a single PlayTemplate with phases and content template names for the catalog drawer.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const template = await prisma.playTemplate.findFirst({
      where: { id, userId: session.user.id },
      include: {
        phases: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            orderIndex: true,
            offsetDays: true,
            contentTemplates: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Play template not found' }, { status: 404 });
    }

    const phases = template.phases.map((p) => ({
      id: p.id,
      name: p.name,
      orderIndex: p.orderIndex,
      offsetDays: p.offsetDays,
      contentTemplates: p.contentTemplates.map((c) => ({ id: c.id, name: c.name })),
    }));

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        slug: template.slug,
        category: template.category,
        triggerType: template.triggerType,
        phaseCount: template.phases.length,
      },
      phases,
    });
  } catch (error) {
    console.error('GET /api/play-templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play template' },
      { status: 500 },
    );
  }
}
