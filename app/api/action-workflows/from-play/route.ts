import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';
import { resolveTemplateForContext } from '@/lib/action-workflows/resolve-template';

/**
 * POST /api/action-workflows/from-play
 *
 * Resolution order:
 * 1. customSteps provided → create workflow directly (no template needed)
 * 2. Explicit templateId
 * 3. signalType → resolveTemplateForContext (activation → roadmap mapping → signal map → fallback)
 * 4. activityId/playId → name/triggerType match (legacy compat)
 * 5. Highest-priority template (last resort)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyId,
      templateId: directTemplateId,
      signalType,
      activityId,
      playId,
      accountSignalId,
      targetDivisionId,
      targetContactId,
      campaignId,
      title,
      description,
      eventContext,
      customSteps,
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 },
      );
    }

    // Custom play: create workflow directly from user-provided steps
    if (Array.isArray(customSteps) && customSteps.length > 0) {
      const channelToContentType: Record<string, string> = {
        email: 'email',
        linkedin: 'linkedin_inmail',
        phone: 'talking_points',
        meeting: 'talking_points',
        briefing: 'presentation',
        content: 'email',
        sales_page: 'sales_page',
        video: 'video',
        gift: 'email',
        event: 'email',
      };
      const workflow = await prisma.actionWorkflow.create({
        data: {
          userId: session.user.id,
          companyId,
          title: title || 'Custom Play',
          description: description || null,
          status: 'active',
          urgencyScore: 50,
          ...(targetDivisionId && { targetDivisionId }),
          steps: {
            create: customSteps.map((step: { order?: number; label: string; description?: string; channel?: string }, idx: number) => ({
              stepOrder: step.order ?? idx + 1,
              stepType: 'generate_content',
              contentType: channelToContentType[step.channel || 'email'] || 'email',
              channel: step.channel || 'email',
              promptHint: step.description || step.label,
              status: idx === 0 ? 'ready' : 'pending',
              ...(targetDivisionId && { divisionId: targetDivisionId }),
            })),
          },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      return NextResponse.json({ workflowId: workflow.id, workflow });
    }

    let templateId: string | undefined = directTemplateId;

    if (!templateId && signalType) {
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        select: { industry: true },
      });
      let deptLabel: string | undefined;
      let deptType: string | undefined;
      if (targetDivisionId) {
        const dept = await prisma.companyDepartment.findFirst({
          where: { id: targetDivisionId },
          select: { customName: true, type: true },
        });
        deptLabel = dept?.customName ?? undefined;
        deptType = dept?.type ?? undefined;
      }
      templateId =
        (await resolveTemplateForContext({
          userId: session.user.id,
          companyId,
          signalType,
          signalId: accountSignalId,
          companyIndustry: company?.industry ?? undefined,
          departmentLabel: deptLabel,
          departmentType: deptType,
        })) ?? undefined;
    }

    if (!templateId && (activityId || playId)) {
      const nameHint = activityId || playId;
      const template = await prisma.playbookTemplate.findFirst({
        where: {
          userId: session.user.id,
          OR: [
            { name: { contains: nameHint, mode: 'insensitive' } },
            { triggerType: nameHint },
          ],
        },
        select: { id: true },
        orderBy: { priority: 'desc' },
      });
      templateId = template?.id;
    }

    if (!templateId) {
      const fallback = await prisma.playbookTemplate.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
        orderBy: { priority: 'desc' },
      });
      templateId = fallback?.id;
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'No matching playbook template found' },
        { status: 404 },
      );
    }

    const workflow = await assembleWorkflow({
      userId: session.user.id,
      companyId,
      templateId,
      accountSignalId,
      targetDivisionId,
      targetContactId,
      campaignId,
      title,
      description,
      eventContext,
    });

    return NextResponse.json({ workflowId: workflow.id, workflow });
  } catch (error) {
    console.error('POST /api/action-workflows/from-play error:', error);
    const err = error as Error & { code?: string; existingWorkflowId?: string };
    if (err.code === 'DUPLICATE_ENROLLMENT') {
      return NextResponse.json(
        { error: err.message, existingWorkflowId: err.existingWorkflowId },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workflow' },
      { status: 500 },
    );
  }
}
