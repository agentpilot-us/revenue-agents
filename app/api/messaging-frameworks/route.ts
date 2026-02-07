import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const frameworks = await prisma.messagingFramework.findMany({
    where: { createdById: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json({ frameworks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, description, content, isDefault } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    const setAsDefault = Boolean(isDefault);
    if (setAsDefault) {
      await prisma.messagingFramework.updateMany({
        where: { createdById: session.user.id },
        data: { isDefault: false },
      });
    }
    const framework = await prisma.messagingFramework.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        content: content.trim(),
        createdById: session.user.id,
        isDefault: setAsDefault,
      },
    });
    return NextResponse.json({ framework });
  } catch (e) {
    console.error('Create messaging framework error:', e);
    return NextResponse.json(
      { error: 'Failed to create messaging framework' },
      { status: 500 }
    );
  }
}
