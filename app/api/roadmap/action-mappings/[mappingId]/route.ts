import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mappingId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mappingId } = await params;

    const existing = await prisma.roadmapActionMapping.findFirst({
      where: { id: mappingId },
      include: { roadmap: { select: { userId: true } } },
    });
    if (!existing || existing.roadmap.userId !== session.user.id) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.signalCategory !== undefined) data.signalCategory = body.signalCategory;
    if (body.actionType !== undefined) data.actionType = body.actionType;
    if (body.autonomyLevel !== undefined) data.autonomyLevel = body.autonomyLevel;
    if (body.promptHint !== undefined) data.promptHint = body.promptHint;
    if (body.templateId !== undefined) data.templateId = body.templateId || null;

    const updated = await prisma.roadmapActionMapping.update({
      where: { id: mappingId },
      data,
    });

    return NextResponse.json({ mapping: updated });
  } catch (error) {
    console.error('PATCH /api/roadmap/action-mappings/[mappingId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mappingId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mappingId } = await params;

    const existing = await prisma.roadmapActionMapping.findFirst({
      where: { id: mappingId },
      include: { roadmap: { select: { userId: true } } },
    });
    if (!existing || existing.roadmap.userId !== session.user.id) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    await prisma.roadmapActionMapping.delete({ where: { id: mappingId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/roadmap/action-mappings/[mappingId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}
