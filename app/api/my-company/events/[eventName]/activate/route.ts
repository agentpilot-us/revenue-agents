import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventName } = await params;
    const userId = session.user.id;

    const attendance = await prisma.eventAttendance.findFirst({
      where: {
        eventName,
        contact: {
          company: { userId },
        },
      },
      select: {
        eventName: true,
        eventDate: true,
        source: true,
        contact: {
          select: {
            companyId: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    if (!attendance || !attendance.contact.companyId) {
      return NextResponse.json({ error: 'Event not found for this user' }, { status: 404 });
    }

    const title = `Activate event: ${attendance.eventName}`;
    const summary = `Track event "${attendance.eventName}" for account ${
      attendance.contact.company?.name ?? ''
    } as a trigger for campaigns and content. Source: ${
      attendance.source
    }. Date: ${attendance.eventDate.toISOString()}.`;

    const signal = await prisma.accountSignal.create({
      data: {
        companyId: attendance.contact.companyId,
        userId,
        type: 'internal_event_trigger',
        title,
        summary,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 6,
        suggestedPlay: 'event_invite',
      },
    });

    // Auto-create workflows for matching accounts
    const workflowIds = await autoCreateEventWorkflows(userId, attendance.eventName);

    return NextResponse.json({ ok: true, signalId: signal.id, workflowsCreated: workflowIds.length });
  } catch (error) {
    console.error('POST /api/my-company/events/[eventName]/activate error:', error);
    return NextResponse.json({ error: 'Failed to activate event trigger' }, { status: 500 });
  }
}

async function autoCreateEventWorkflows(userId: string, eventName: string): Promise<string[]> {
  const template = await prisma.playbookTemplate.findFirst({
    where: {
      userId,
      OR: [
        { triggerType: 'event' },
        { name: { contains: 'Event Invite', mode: 'insensitive' } },
        { name: { contains: 'Event', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      targetDepartmentTypes: true,
      targetIndustries: true,
    },
    orderBy: { priority: 'desc' },
  });
  if (!template) return [];

  const targetDepts = (template.targetDepartmentTypes as string[]) ?? [];
  const targetIndustries = (template.targetIndustries as string[]) ?? [];

  const companies = await prisma.company.findMany({
    where: {
      userId,
      ...(targetIndustries.length > 0 && { industry: { in: targetIndustries, mode: 'insensitive' } }),
    },
    select: {
      id: true,
      name: true,
      departments: { select: { id: true, type: true } },
    },
  });

  const workflowIds: string[] = [];

  for (const company of companies) {
    const hasDeptMatch = targetDepts.length === 0 ||
      company.departments.some((d) => d.type && targetDepts.includes(d.type));

    if (!hasDeptMatch) continue;

    try {
      const workflow = await assembleWorkflow({
        userId,
        companyId: company.id,
        templateId: template.id,
        title: `${eventName} — ${company.name}`,
        description: `Event invite workflow for ${company.name}`,
      });
      workflowIds.push(workflow.id);
    } catch {
      console.warn(`Skipped workflow for ${company.name}: assembly failed`);
    }
  }

  return workflowIds;
}
