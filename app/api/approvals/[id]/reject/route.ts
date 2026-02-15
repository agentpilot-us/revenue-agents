import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bodySchema = z.object({
  comment: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pending = await prisma.pendingAction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!pending) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (pending.status !== 'pending') {
      return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
    }

    let comment: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      const parsed = bodySchema.safeParse(body);
      if (parsed.success && parsed.data.comment !== undefined) {
        comment = parsed.data.comment;
      }
    } catch {
      // no body
    }

    await prisma.pendingAction.update({
      where: { id },
      data: {
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedByUserId: session.user.id,
        ...(comment !== undefined && { comment }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('POST /api/approvals/[id]/reject', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
