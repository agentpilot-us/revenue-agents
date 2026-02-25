/**
 * PATCH /api/signals/[signalId]/dismiss
 * Set signal status to 'seen' or 'acted' so it no longer appears in Hot Signals (which filters status: 'new').
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signalId } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status === 'acted' ? 'acted' : 'seen';

    const signal = await prisma.accountSignal.findFirst({
      where: { id: signalId, userId: session.user.id },
    });
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    await prisma.accountSignal.update({
      where: { id: signalId },
      data: { status },
    });

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error('PATCH /api/signals/[signalId]/dismiss error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dismiss' },
      { status: 500 }
    );
  }
}
