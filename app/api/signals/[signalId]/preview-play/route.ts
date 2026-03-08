import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { resolveTemplateForContext } from '@/lib/action-workflows/resolve-template';

/**
 * GET /api/signals/[signalId]/preview-play
 *
 * Resolves the matched PlaybookTemplate for a signal without creating a workflow.
 * Returns template name, priority, timing, and step summaries for UI preview.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ signalId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { signalId } = await params;

  const signal = await prisma.accountSignal.findUnique({
    where: { id: signalId },
    select: {
      id: true,
      companyId: true,
      userId: true,
      type: true,
      title: true,
      summary: true,
      relevanceScore: true,
    },
  });

  if (!signal || signal.userId !== session.user.id) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }

  const templateId = await resolveTemplateForContext({
    userId: session.user.id,
    companyId: signal.companyId,
    signalType: signal.type,
    signalId: signal.id,
  });

  if (!templateId) {
    return NextResponse.json({
      matched: false,
      signal: {
        id: signal.id,
        type: signal.type,
        title: signal.title,
        summary: signal.summary,
      },
    });
  }

  const template = await prisma.playbookTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      name: true,
      description: true,
      triggerType: true,
      priority: true,
      timingConfig: true,
      expectedOutcome: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          order: true,
          name: true,
          description: true,
          channel: true,
          assetTypes: true,
          promptHint: true,
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ matched: false });
  }

  const timingConfig = template.timingConfig as Record<string, unknown> | null;
  const validWindowDays = timingConfig?.validWindowDays as number | undefined;
  let timingWindow: string | undefined;
  if (validWindowDays) {
    const weeks = Math.ceil(validWindowDays / 7);
    timingWindow = weeks <= 1 ? 'Week 1' : `Week 1\u2013${weeks}`;
  }

  return NextResponse.json({
    matched: true,
    signal: {
      id: signal.id,
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      relevanceScore: signal.relevanceScore,
    },
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      priority: template.priority,
      timingWindow,
      expectedOutcome: template.expectedOutcome,
      steps: template.steps.map((s) => ({
        order: s.order,
        name: s.name,
        description: s.description,
        channel: s.channel,
      })),
    },
  });
}
