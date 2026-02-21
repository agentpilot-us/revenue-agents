import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

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
    if (!id) {
      return NextResponse.json({ error: 'Missing content id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Prisma.ContentLibraryUpdateManyMutationInput = {};

    if (typeof body.isPinned === 'boolean') {
      updates.isPinned = body.isPinned;
    }
    if (typeof body.userConfirmed === 'boolean') {
      updates.userConfirmed = body.userConfirmed;
    }
    if (body.extraction && typeof body.extraction === 'object') {
      const row = await prisma.contentLibrary.findFirst({
        where: { id, userId: session.user.id },
        select: { content: true },
      });
      if (row && row.content && typeof row.content === 'object') {
        const current = row.content as Record<string, unknown>;
        updates.content = {
          ...current,
          extraction: { ...(current.extraction as Record<string, unknown> || {}), ...body.extraction },
        } as Prisma.InputJsonValue;
      }
    } else if (body.content && typeof body.content === 'object') {
      updates.content = body.content as Prisma.InputJsonValue;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.contentLibrary.updateMany({
      where: { id, userId: session.user.id },
      data: updates,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Content library update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing content id' }, { status: 400 });
    }

    const deleted = await prisma.contentLibrary.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Content library delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
