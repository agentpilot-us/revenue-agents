import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const template = await prisma.playbookTemplate.findFirst({
      where: { id, userId: session.user.id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { actionWorkflows: true, activations: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('GET /api/playbooks/templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

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
    const existing = await prisma.playbookTemplate.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    const fields = [
      'name', 'description', 'triggerType', 'isDefault',
      'targetDepartmentTypes', 'targetIndustries', 'targetPersonas',
      'timingConfig', 'expectedOutcome', 'priority',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    const updated = await prisma.playbookTemplate.update({
      where: { id },
      data,
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('PATCH /api/playbooks/templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
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
    const existing = await prisma.playbookTemplate.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (existing.isBuiltIn) {
      return NextResponse.json({ error: 'Cannot delete built-in templates' }, { status: 400 });
    }

    await prisma.playbookTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/playbooks/templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
