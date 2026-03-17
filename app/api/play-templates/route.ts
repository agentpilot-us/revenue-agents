import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/play-templates
 * List PlayTemplates (new schema) for the current user. Returns ACTIVE templates
 * with phase count for the Play catalog.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.playTemplate.findMany({
      where: { userId: session.user.id, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        category: true,
        triggerType: true,
        scope: true,
        _count: { select: { phases: true } },
      },
      orderBy: { name: 'asc' },
    });

    const list = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      slug: t.slug,
      category: t.category,
      triggerType: t.triggerType,
      scope: t.scope,
      phaseCount: t._count.phases,
    }));

    return NextResponse.json({ templates: list });
  } catch (error) {
    console.error('GET /api/play-templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play templates' },
      { status: 500 },
    );
  }
}
