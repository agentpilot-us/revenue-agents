import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configId } = await params;
    const existing = await prisma.customSignalConfig.findFirst({
      where: { id: configId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.config !== undefined) data.config = body.config;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.customSignalConfig.update({
      where: { id: configId },
      data,
    });

    return NextResponse.json({ config: updated });
  } catch (error) {
    console.error('PATCH /api/signals/config/[configId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configId } = await params;
    const existing = await prisma.customSignalConfig.findFirst({
      where: { id: configId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    await prisma.customSignalConfig.delete({ where: { id: configId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/signals/config/[configId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete config' },
      { status: 500 }
    );
  }
}
