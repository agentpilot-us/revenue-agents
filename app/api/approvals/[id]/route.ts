import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  payload: z.record(z.unknown()).optional(),
  comment: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.pendingAction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Can only edit pending actions' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const update: { payload?: unknown; comment?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (parsed.data.payload !== undefined) update.payload = parsed.data.payload;
    if (parsed.data.comment !== undefined) update.comment = parsed.data.comment;

    const updated = await prisma.pendingAction.update({
      where: { id },
      data: update,
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/approvals/[id]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
