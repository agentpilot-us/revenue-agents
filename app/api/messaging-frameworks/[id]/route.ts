import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const framework = await prisma.messagingFramework.findFirst({
    where: { id, createdById: session.user.id },
  });
  if (!framework) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ framework });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.messagingFramework.findFirst({
    where: { id, createdById: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const body = await req.json();
    if (body.isDefault === true) {
      await prisma.messagingFramework.updateMany({
        where: { createdById: session.user.id },
        data: { isDefault: false },
      });
    }
    const framework = await prisma.messagingFramework.update({
      where: { id },
      data: {
        ...(body.name != null && { name: String(body.name).trim() }),
        ...(body.description != null && { description: body.description ? String(body.description).trim() : null }),
        ...(body.content != null && { content: String(body.content).trim() }),
        ...(body.isDefault != null && { isDefault: Boolean(body.isDefault) }),
      },
    });
    return NextResponse.json({ framework });
  } catch (e) {
    console.error('Update messaging framework error:', e);
    return NextResponse.json(
      { error: 'Failed to update messaging framework' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.messagingFramework.findFirst({
    where: { id, createdById: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.messagingFramework.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
