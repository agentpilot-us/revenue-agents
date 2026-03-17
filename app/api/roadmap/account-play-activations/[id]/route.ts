import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * PATCH /api/roadmap/account-play-activations/[id]
 * Update isActive or customConfig.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.accountPlayActivation.findFirst({
      where: { id },
      include: { roadmap: { select: { userId: true } } },
    });
    if (!existing || existing.roadmap.userId !== session.user.id) {
      return NextResponse.json({ error: 'Activation not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Prisma.AccountPlayActivationUpdateInput = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.customConfig !== undefined) {
      data.customConfig = body.customConfig == null ? Prisma.JsonNull : (body.customConfig as Prisma.InputJsonValue);
    }

    const updated = await prisma.accountPlayActivation.update({
      where: { id },
      data,
    });

    return NextResponse.json({ activation: updated });
  } catch (error) {
    console.error('PATCH /api/roadmap/account-play-activations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update activation' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/roadmap/account-play-activations/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.accountPlayActivation.findFirst({
      where: { id },
      include: { roadmap: { select: { userId: true } } },
    });
    if (!existing || existing.roadmap.userId !== session.user.id) {
      return NextResponse.json({ error: 'Activation not found' }, { status: 404 });
    }

    await prisma.accountPlayActivation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/roadmap/account-play-activations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete activation' },
      { status: 500 },
    );
  }
}
