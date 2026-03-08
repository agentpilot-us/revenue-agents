import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, stepId } = await params;

    const template = await prisma.playbookTemplate.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    const fields = [
      'name', 'label', 'description', 'channel', 'assetTypes',
      'promptHint', 'dayOffset', 'order', 'playId', 'phase',
      'targetPersona', 'assignedRole', 'requiresApproval',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    const step = await prisma.playbookTemplateStep.update({
      where: { id: stepId },
      data,
    });

    return NextResponse.json({ step });
  } catch (error) {
    console.error('PATCH step error:', error);
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, stepId } = await params;

    const template = await prisma.playbookTemplate.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.playbookTemplateStep.delete({ where: { id: stepId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE step error:', error);
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
  }
}
