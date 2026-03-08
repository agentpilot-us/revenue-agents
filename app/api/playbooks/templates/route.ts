import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const templates = await prisma.playbookTemplate.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { steps: true } } },
    orderBy: [{ priority: 'desc' }, { isDefault: 'desc' }, { isBuiltIn: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      isBuiltIn: t.isBuiltIn,
      isDefault: t.isDefault ?? t.isBuiltIn,
      triggerType: t.triggerType ?? 'manual',
      stepCount: t._count.steps,
      targetDepartmentTypes: t.targetDepartmentTypes,
      targetIndustries: t.targetIndustries,
      targetPersonas: t.targetPersonas,
      timingConfig: t.timingConfig,
      expectedOutcome: t.expectedOutcome,
      priority: t.priority,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      triggerType,
      targetDepartmentTypes,
      targetIndustries,
      targetPersonas,
      timingConfig,
      expectedOutcome,
      priority,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const template = await prisma.playbookTemplate.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description ?? null,
        triggerType: triggerType ?? 'manual',
        targetDepartmentTypes: targetDepartmentTypes ?? null,
        targetIndustries: targetIndustries ?? null,
        targetPersonas: targetPersonas ?? null,
        timingConfig: timingConfig ?? null,
        expectedOutcome: expectedOutcome ?? null,
        priority: priority ?? 0,
      },
      include: { _count: { select: { steps: true } } },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('POST /api/playbooks/templates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 },
    );
  }
}
