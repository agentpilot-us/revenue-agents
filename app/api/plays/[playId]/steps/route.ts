import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * Returns the steps for a play. Resolves the playId against PlaybookTemplate
 * by name/triggerType match, then returns its PlaybookTemplateStep records.
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

  const template = await prisma.playbookTemplate.findFirst({
    where: {
      userId: session.user.id,
      OR: [
        { name: { contains: playId, mode: 'insensitive' } },
        { triggerType: playId },
      ],
    },
    include: {
      steps: { orderBy: { order: 'asc' } },
    },
    orderBy: { priority: 'desc' },
  });

  if (!template) {
    return NextResponse.json({ steps: [] });
  }

  const steps = template.steps.map((s) => ({
    order: s.order,
    label: s.label ?? s.name ?? `Step ${s.order}`,
    description: s.description ?? '',
    channel: s.channel ?? undefined,
  }));

  return NextResponse.json({ steps });
}
