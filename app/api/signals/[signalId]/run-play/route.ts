import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { buildContextFromSignal } from '@/lib/signals/signal-to-play-context';
import { executePlay } from '@/lib/plays/execute-play';
import type { PlayId } from '@/lib/plays/play-definitions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { signalId } = await params;

  const signal = await prisma.accountSignal.findFirst({
    where: { id: signalId, userId: session.user.id },
    include: {
      company: {
        include: {
          departments: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  if (!signal) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }
  if (!signal.suggestedPlay) {
    return NextResponse.json(
      { error: 'No play suggested for this signal' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const segmentId =
    body.segmentId ?? signal.company.departments[0]?.id;

  if (!segmentId) {
    return NextResponse.json(
      { error: 'No segment found — add a buying group to this account first' },
      { status: 400 }
    );
  }

  const context = await buildContextFromSignal(signal, segmentId);

  const result = await executePlay({
    playId: signal.suggestedPlay as PlayId,
    companyId: signal.companyId,
    userId: session.user.id,
    context,
    ctaUrl: body.ctaUrl,
  });

  // Mark signal as acted on so it leaves Hot Signals
  await prisma.accountSignal.update({
    where: { id: signalId },
    data: { status: 'acted' },
  });

  return NextResponse.json(result);
}
