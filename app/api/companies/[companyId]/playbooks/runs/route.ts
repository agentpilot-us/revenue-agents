/**
 * GET  /api/companies/[companyId]/playbooks/runs — list runs for company
 * POST /api/companies/[companyId]/playbooks/runs — create a new run
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const runs = await prisma.playbookRun.findMany({
    where: { companyId, status: { in: ['active', 'paused'] } },
    include: {
      template: { include: { steps: { orderBy: { order: 'asc' } } } },
      steps: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  return NextResponse.json({ runs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: {
    templateId?: string;
    triggerDate?: string;
    triggerLabel?: string;
    triggerContext?: { triggerDate?: string; triggerLabel?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const templateId = body.templateId;
  const triggerDate = body.triggerDate ?? body.triggerContext?.triggerDate;
  const triggerLabel = body.triggerLabel ?? body.triggerContext?.triggerLabel;

  if (!templateId || !triggerDate) {
    return NextResponse.json(
      { error: 'templateId and triggerDate are required' },
      { status: 400 }
    );
  }

  const template = await prisma.playbookTemplate.findFirst({
    where: { id: templateId, userId: session.user.id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const run = await prisma.playbookRun.create({
    data: {
      companyId,
      templateId: template.id,
      triggerContext: {
        triggerDate,
        triggerLabel: triggerLabel ?? template.name,
      },
      steps: {
        create: template.steps.map((s) => ({ stepOrder: s.order })),
      },
    },
    include: {
      template: { include: { steps: { orderBy: { order: 'asc' } } } },
      steps: true,
    },
  });

  await prisma.activity
    .create({
      data: {
        companyId,
        userId: session.user.id,
        type: 'PLAYBOOK_STARTED',
        summary: `Playbook started: ${template.name}`,
        metadata: {
          playbookRunId: run.id,
          templateName: template.name,
          triggerDate,
          triggerLabel: triggerLabel ?? template.name,
          stepCount: template.steps.length,
        },
      },
    })
    .catch(() => {});

  return NextResponse.json({ run, runId: run.id });
}
