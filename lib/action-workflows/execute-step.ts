/**
 * Execute an ActionWorkflowStep: route to the right channel and create Activity.
 *
 * Reuses:
 * - getOutboundProvider().send() for email
 * - Activity creation pattern from chat route
 * - Contact touch field updates
 */

import { prisma } from '@/lib/db';
import { getOutboundProvider } from '@/lib/email';

export type ExecuteStepInput = {
  workflowId: string;
  stepId: string;
  userId: string;
};

export type ExecuteStepResult = {
  ok: boolean;
  channel: string;
  activityId?: string;
  error?: string;
};

export async function executeStep(
  input: ExecuteStepInput,
): Promise<ExecuteStepResult> {
  const { workflowId, stepId, userId } = input;

  const step = await prisma.actionWorkflowStep.findFirst({
    where: { id: stepId, workflowId },
    include: {
      workflow: {
        select: { companyId: true, userId: true, title: true },
      },
      contact: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  if (!step) throw new Error('Step not found');
  if (step.workflow.userId !== userId) throw new Error('Unauthorized');

  const content = (step.editedContent || step.generatedContent) as Record<
    string,
    string
  > | null;
  if (!content) throw new Error('No content to send — generate first');

  const channel = step.channel || step.contentType || 'email';

  switch (channel) {
    case 'email':
      return executeEmailStep(step, content, userId);
    case 'linkedin':
    case 'linkedin_inmail':
    case 'linkedin_post':
      return executeLinkedInStep(step, content);
    case 'meeting':
      return markStepComplete(step, 'meeting');
    default:
      return markStepComplete(step, channel);
  }
}

async function executeEmailStep(
  step: StepWithRelations,
  content: Record<string, string>,
  userId: string,
): Promise<ExecuteStepResult> {
  const recipientEmail = step.contact?.email;
  if (!recipientEmail) {
    await prisma.actionWorkflowStep.update({
      where: { id: step.id },
      data: { status: 'failed', failureReason: 'No recipient email' },
    });
    return { ok: false, channel: 'email', error: 'No recipient email' };
  }

  const provider = await getOutboundProvider(userId);
  const subject = content.subject || `Re: ${step.workflow.title}`;
  const body = content.body || content.raw || '';
  const html = body.replace(/\n/g, '<br/>');

  const result = await provider.send({
    to: recipientEmail,
    subject,
    html,
    text: body,
  });

  if (!result.ok) {
    await prisma.actionWorkflowStep.update({
      where: { id: step.id },
      data: { status: 'failed', failureReason: result.error },
    });
    return { ok: false, channel: 'email', error: result.error };
  }

  const activity = await prisma.activity.create({
    data: {
      type: 'EMAIL_SENT',
      summary: `Sent email: ${subject}`,
      content: body,
      subject,
      body,
      companyId: step.workflow.companyId,
      contactId: step.contact?.id || undefined,
      userId,
      resendEmailId: result.messageId,
      agentUsed: 'action_workflow',
    },
  });

  await prisma.actionWorkflowStep.update({
    where: { id: step.id },
    data: {
      status: 'sent',
      activityId: activity.id,
      completedAt: new Date(),
    },
  });

  if (step.contact?.id) {
    await prisma.contact.update({
      where: { id: step.contact.id },
      data: {
        lastEmailSentAt: new Date(),
        lastContactedAt: new Date(),
        lastContactMethod: 'email',
        totalEmailsSent: { increment: 1 },
      },
    });
  }

  await checkWorkflowCompletion(step.workflowId);

  return { ok: true, channel: 'email', activityId: activity.id };
}

async function executeLinkedInStep(
  step: StepWithRelations,
  content: Record<string, string>,
): Promise<ExecuteStepResult> {
  const activity = await prisma.activity.create({
    data: {
      type: 'LINKEDIN_DRAFTED',
      summary: `LinkedIn message drafted for ${step.contact?.firstName || 'contact'}`,
      content: content.body || content.raw || '',
      companyId: step.workflow.companyId,
      contactId: step.contact?.id || undefined,
      userId: step.workflow.userId,
      agentUsed: 'action_workflow',
    },
  });

  await prisma.actionWorkflowStep.update({
    where: { id: step.id },
    data: {
      status: 'sent',
      activityId: activity.id,
      completedAt: new Date(),
    },
  });

  if (step.contact?.id) {
    await prisma.contact.update({
      where: { id: step.contact.id },
      data: {
        lastContactedAt: new Date(),
        lastContactMethod: 'linkedin',
      },
    });
  }

  await checkWorkflowCompletion(step.workflowId);

  return { ok: true, channel: 'linkedin', activityId: activity.id };
}

async function markStepComplete(
  step: StepWithRelations,
  channel: string,
): Promise<ExecuteStepResult> {
  let activityId: string | undefined;

  if (channel === 'meeting' || step.channel === 'meeting') {
    const activity = await prisma.activity.create({
      data: {
        type: 'MEETING_SCHEDULED',
        summary: `Meeting: ${step.workflow.title}`,
        companyId: step.workflow.companyId,
        userId: step.workflow.userId,
        contactId: step.contact?.id ?? undefined,
        agentUsed: 'action_workflow',
      },
    });
    activityId = activity.id;
  }

  await prisma.actionWorkflowStep.update({
    where: { id: step.id },
    data: {
      status: 'sent',
      completedAt: new Date(),
      ...(activityId ? { activityId } : {}),
    },
  });

  await checkWorkflowCompletion(step.workflowId);

  return { ok: true, channel, activityId };
}

async function checkWorkflowCompletion(workflowId: string) {
  const steps = await prisma.actionWorkflowStep.findMany({
    where: { workflowId },
    select: { status: true },
  });

  const allDone = steps.every(
    (s) => s.status === 'sent' || s.status === 'skipped',
  );

  if (allDone) {
    await prisma.actionWorkflow.update({
      where: { id: workflowId },
      data: { status: 'completed', completedAt: new Date() },
    });
  } else {
    await prisma.actionWorkflow.update({
      where: { id: workflowId },
      data: { status: 'in_progress' },
    });
  }
}

type StepWithRelations = {
  id: string;
  workflowId: string;
  channel: string | null;
  contentType: string | null;
  editedContent: unknown;
  generatedContent: unknown;
  workflow: { companyId: string; userId: string; title: string };
  contact: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};
