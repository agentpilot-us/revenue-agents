import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/triggers/preview-play?triggerType=event
 *
 * Resolves the matched PlayTemplate for a company trigger type (event/product).
 * Returns template name and phases; would create PlayRun.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const triggerTypeParam = req.nextUrl.searchParams.get('triggerType') ?? 'event';

  const template = await prisma.playTemplate.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
      OR: [
        { triggerType: 'SIGNAL' },
        { name: { contains: triggerTypeParam === 'event' ? 'Event Invite' : 'Product', mode: 'insensitive' } },
        { name: { contains: 'Event', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      triggerType: true,
      phases: {
        orderBy: { orderIndex: 'asc' },
        select: { name: true, orderIndex: true },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ matched: false });
  }

  const phases = template.phases.map((p) => ({ order: p.orderIndex, name: p.name }));

  return NextResponse.json({
    matched: true,
    wouldCreate: 'PlayRun',
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      phases,
    },
  });
}
