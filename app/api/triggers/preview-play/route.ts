import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/triggers/preview-play?triggerType=event
 *
 * Resolves the matched PlaybookTemplate for a company trigger type (event/product).
 * Returns template name, priority, timing, and step summaries for UI preview.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const triggerType = req.nextUrl.searchParams.get('triggerType') ?? 'event';

  const template = await prisma.playbookTemplate.findFirst({
    where: {
      userId: session.user.id,
      OR: [
        { triggerType },
        { name: { contains: triggerType === 'event' ? 'Event Invite' : 'Product', mode: 'insensitive' } },
      ],
    },
    orderBy: { priority: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      triggerType: true,
      priority: true,
      timingConfig: true,
      expectedOutcome: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          order: true,
          name: true,
          description: true,
          channel: true,
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ matched: false });
  }

  const timingConfig = template.timingConfig as Record<string, unknown> | null;
  const validWindowDays = timingConfig?.validWindowDays as number | undefined;
  let timingWindow: string | undefined;
  if (validWindowDays) {
    const weeks = Math.ceil(validWindowDays / 7);
    timingWindow = weeks <= 1 ? 'Week 1' : `Week 1\u2013${weeks}`;
  }

  return NextResponse.json({
    matched: true,
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      priority: template.priority,
      timingWindow,
      expectedOutcome: template.expectedOutcome,
      steps: template.steps.map((s) => ({
        order: s.order,
        name: s.name,
        description: s.description,
        channel: s.channel,
      })),
    },
  });
}
