import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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
    const existing = await prisma.playbookActivation.findFirst({
      where: { id },
      include: { roadmap: { select: { userId: true } } },
    });
    if (!existing || existing.roadmap.userId !== session.user.id) {
      return NextResponse.json({ error: 'Activation not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.customConfig !== undefined) data.customConfig = body.customConfig;

    const updated = await prisma.playbookActivation.update({
      where: { id },
      data,
    });

    return NextResponse.json({ activation: updated });
  } catch (error) {
    console.error('PATCH playbook-activation error:', error);
    return NextResponse.json({ error: 'Failed to update activation' }, { status: 500 });
  }
}

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
    const existing = await prisma.playbookActivation.findFirst({
      where: { id },
      include: { roadmap: { select: { userId: true } } },
    });
    if (!existing || existing.roadmap.userId !== session.user.id) {
      return NextResponse.json({ error: 'Activation not found' }, { status: 404 });
    }

    await prisma.playbookActivation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE playbook-activation error:', error);
    return NextResponse.json({ error: 'Failed to delete activation' }, { status: 500 });
  }
}
