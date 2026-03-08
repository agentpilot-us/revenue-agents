import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
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
      include: { steps: { orderBy: { order: 'desc' }, take: 1 } },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await req.json();

    // Bulk reorder mode
    if (body.reorder && Array.isArray(body.reorder)) {
      const updates = body.reorder.map(
        (item: { id: string; order: number }) =>
          prisma.playbookTemplateStep.update({
            where: { id: item.id },
            data: { order: item.order },
          }),
      );
      await prisma.$transaction(updates);
      const steps = await prisma.playbookTemplateStep.findMany({
        where: { templateId: id },
        orderBy: { order: 'asc' },
      });
      return NextResponse.json({ steps });
    }

    const nextOrder = (template.steps[0]?.order ?? 0) + 1;

    const step = await prisma.playbookTemplateStep.create({
      data: {
        templateId: id,
        order: body.order ?? nextOrder,
        name: body.name ?? null,
        label: body.label ?? null,
        description: body.description ?? null,
        channel: body.channel ?? null,
        assetTypes: body.assetTypes ?? null,
        promptHint: body.promptHint ?? null,
        dayOffset: body.dayOffset ?? null,
        playId: body.playId ?? null,
        phase: body.phase ?? null,
        targetPersona: body.targetPersona ?? null,
        assignedRole: body.assignedRole ?? null,
        requiresApproval: body.requiresApproval ?? false,
      },
    });

    return NextResponse.json({ step }, { status: 201 });
  } catch (error) {
    console.error('POST /api/playbooks/templates/[id]/steps error:', error);
    return NextResponse.json({ error: 'Failed to create step' }, { status: 500 });
  }
}
