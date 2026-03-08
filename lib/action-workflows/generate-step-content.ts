/**
 * Generate content for an ActionWorkflowStep.
 *
 * Wraps the existing generateOneContent() engine with workflow context
 * (signal, account context, prompt hint from the step).
 */

import { prisma } from '@/lib/db';
import { generateOneContent, type GenerateContentType } from '@/lib/plays/generate-content';

export type GenerateStepContentInput = {
  workflowId: string;
  stepId: string;
  userId: string;
};

const CONTENT_TYPE_MAP: Record<string, GenerateContentType> = {
  email: 'email',
  linkedin_inmail: 'linkedin',
  linkedin_post: 'linkedin',
  talking_points: 'talking_points',
  presentation: 'presentation',
  sms: 'email',
};

export async function generateStepContent(input: GenerateStepContentInput) {
  const { workflowId, stepId, userId } = input;

  const workflow = await prisma.actionWorkflow.findFirst({
    where: { id: workflowId, userId },
    include: {
      company: { select: { id: true, name: true, industry: true, dealObjective: true, dealContext: true } },
      targetContact: {
        select: { id: true, firstName: true, lastName: true, title: true },
      },
    },
  });
  if (!workflow) throw new Error('Workflow not found');

  const step = await prisma.actionWorkflowStep.findFirst({
    where: { id: stepId, workflowId },
  });
  if (!step) throw new Error('Step not found');

  await prisma.actionWorkflowStep.update({
    where: { id: stepId },
    data: { status: 'generating' },
  });

  try {
    const contentType: GenerateContentType =
      CONTENT_TYPE_MAP[step.contentType || ''] || 'email';

    const signalContext = workflow.signalContext as Record<string, unknown> | null;
    const signalLine = signalContext
      ? `\nTriggering signal: ${signalContext.title || ''} — ${signalContext.summary || ''}`
      : '';

    const contactLine = workflow.targetContact
      ? `\nTarget contact: ${workflow.targetContact.firstName} ${workflow.targetContact.lastName}, ${workflow.targetContact.title || 'Unknown Title'}`
      : '';

    const accountCtx = workflow.accountContext as Record<string, unknown> | null;
    const eventCtx = accountCtx?.event as Record<string, unknown> | null;
    let eventLine = '';
    if (eventCtx) {
      const parts = [`Event: ${eventCtx.eventTitle || ''}`];
      if (eventCtx.eventDate || eventCtx.date) parts.push(`Date: ${eventCtx.eventDate || eventCtx.date}`);
      if (eventCtx.location) parts.push(`Location: ${eventCtx.location}`);
      if (eventCtx.description) parts.push(`Description: ${eventCtx.description}`);
      if (eventCtx.registrationUrl) parts.push(`Registration: ${eventCtx.registrationUrl}`);
      if (Array.isArray(eventCtx.topics) && eventCtx.topics.length > 0) parts.push(`Topics/Sessions: ${(eventCtx.topics as string[]).join(', ')}`);
      if (Array.isArray(eventCtx.speakers) && eventCtx.speakers.length > 0) parts.push(`Speakers: ${(eventCtx.speakers as string[]).join(', ')}`);
      eventLine = '\n' + parts.join('\n');
    }

    let dealLine = '';
    if (workflow.company.dealObjective) {
      dealLine += `\nDeal objective: ${workflow.company.dealObjective}`;
    }
    if (workflow.company.dealContext && typeof workflow.company.dealContext === 'object') {
      const dc = workflow.company.dealContext as Record<string, unknown>;
      if (dc.buyingMotion) dealLine += `\nBuying motion: ${dc.buyingMotion}`;
      if (dc.dealGoal) dealLine += `\nDeal goal: ${dc.dealGoal}`;
    }

    const prompt = [
      `Action: ${workflow.title}`,
      step.promptHint || `Generate ${contentType} content for this outreach step.`,
      signalLine,
      eventLine,
      contactLine,
      dealLine,
    ]
      .filter(Boolean)
      .join('\n');

    const { content } = await generateOneContent({
      companyId: workflow.companyId,
      userId,
      contentType,
      prompt,
      divisionId: step.divisionId || undefined,
    });

    const generatedContent = parseContentByType(content, contentType);

    const updated = await prisma.actionWorkflowStep.update({
      where: { id: stepId },
      data: {
        status: 'ready',
        generatedContent,
      },
    });

    return updated;
  } catch (error) {
    await prisma.actionWorkflowStep.update({
      where: { id: stepId },
      data: {
        status: 'failed',
        failureReason:
          error instanceof Error ? error.message : 'Unknown generation error',
      },
    });
    throw error;
  }
}

function parseContentByType(
  raw: string,
  contentType: GenerateContentType,
): Record<string, string> {
  if (contentType === 'email') {
    const subjectMatch = raw.match(/^Subject:\s*(.+)/im);
    const subject = subjectMatch ? subjectMatch[1].trim() : '';
    const body = raw.replace(/^Subject:\s*.+\n?\n?/im, '').trim();
    return { subject, body, raw };
  }
  return { body: raw, raw };
}
