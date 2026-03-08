import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';
import { resolveTemplateForContext } from '@/lib/action-workflows/resolve-template';

/**
 * POST /api/action-workflows/from-play
 *
 * Resolution order:
 * 1. Explicit templateId
 * 2. signalType → resolveTemplateForContext (activation → roadmap mapping → signal map → fallback)
 * 3. activityId/playId → name/triggerType match (legacy compat)
 * 4. Highest-priority template (last resort)
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
    } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 },
      );
    }

    let templateId: string | undefined = directTemplateId;

    if (!templateId && signalType) {
      templateId =
        (await resolveTemplateForContext({
          userId: session.user.id,
          companyId,
          signalType,
          signalId: accountSignalId,
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
