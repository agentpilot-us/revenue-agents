import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * Returns phase-like steps for a play id hint (name/slug/triggerType match on PlayTemplate).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { playId } = await params;

  const template = await prisma.playTemplate.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
      OR: [{ name: { contains: playId, mode: 'insensitive' } }, { slug: playId }],
    },
    include: {
      phases: {
        orderBy: { orderIndex: 'asc' },
        select: {
          orderIndex: true,
          name: true,
          description: true,
          contentTemplates: { select: { channel: true } },
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ steps: [] });
  }

  const steps = template.phases.map((p) => ({
    order: p.orderIndex + 1,
    label: p.name,
    description: p.description ?? '',
    channel: p.contentTemplates[0]?.channel ?? undefined,
  }));

  return NextResponse.json({ steps });
}
