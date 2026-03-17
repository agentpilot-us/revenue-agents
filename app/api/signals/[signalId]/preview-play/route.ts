import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/signals/[signalId]/preview-play
 *
 * Resolves the matched PlayTemplate for a signal via SignalPlayMapping (no run created).
 * Returns template name and phases for UI preview; would create PlayRun.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { signalId } = await params;

  const signal = await prisma.accountSignal.findUnique({
    where: { id: signalId },
    select: {
      id: true,
      companyId: true,
      userId: true,
      type: true,
      title: true,
      summary: true,
      relevanceScore: true,
    },
  });

  if (!signal || signal.userId !== session.user.id) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }

  const signalTypeNorm = signal.type.trim().toLowerCase();
  const mappings = await prisma.signalPlayMapping.findMany({
    where: {
      userId: signal.userId,
      playTemplate: { status: 'ACTIVE' },
    },
    include: {
      playTemplate: {
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
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const matching = mappings.find((m) => {
    const t = m.signalType.trim().toLowerCase();
    return t === signalTypeNorm || signalTypeNorm.includes(t) || t.includes(signalTypeNorm);
  });

  if (!matching) {
    return NextResponse.json({
      matched: false,
      signal: {
        id: signal.id,
        type: signal.type,
        title: signal.title,
        summary: signal.summary,
      },
    });
  }

  const template = matching.playTemplate;
  const phases = template.phases.map((p) => ({ order: p.orderIndex, name: p.name }));

  return NextResponse.json({
    matched: true,
    wouldCreate: 'PlayRun',
    signal: {
      id: signal.id,
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      relevanceScore: signal.relevanceScore,
    },
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      phases,
    },
  });
}
