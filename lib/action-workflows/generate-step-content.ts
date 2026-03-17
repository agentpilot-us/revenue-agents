import { prisma } from '@/lib/db';
import { generateOneContent } from '@/lib/content/generate-content';
import { buildContentContext } from '@/lib/content/build-content-context';
import { buildAssetPackage } from '@/lib/content/build-asset-package';
import {
  getChannelConfig,
  playContentTypeToChannel,
  type ChannelId,
} from '@/lib/content/channel-config';

export type GenerateStepContentInput = {
  workflowId: string;
  stepId: string;
  userId: string;
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
    const channelId = resolveStepChannel(step.contentType || step.channel || '');
    const contactsForTone = workflow.targetContact
      ? [
          {
            firstName: workflow.targetContact.firstName,
            lastName: workflow.targetContact.lastName,
            title: workflow.targetContact.title,
          },
        ]
      : undefined;

    const signal = toRecord(workflow.signalContext);
    const accountContext = toRecord(workflow.accountContext);
    const event = toRecord(accountContext?.event);

    const prompt = [
      `Action: ${workflow.title}`,
      step.promptHint || `Generate ${channelId} content for this outreach step.`,
      workflow.targetContact
        ? `Target contact: ${workflow.targetContact.firstName ?? ''} ${
            workflow.targetContact.lastName ?? ''
          }, ${workflow.targetContact.title || 'Unknown Title'}`
        : '',
      workflow.company.dealObjective
        ? `Deal objective: ${workflow.company.dealObjective}`
        : '',
      accountContext?.dealGoal ? `Deal goal: ${String(accountContext.dealGoal)}` : '',
      accountContext?.buyingMotion
        ? `Buying motion: ${String(accountContext.buyingMotion)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const generationInput = {
      companyId: workflow.companyId,
      userId,
      channel: channelId,
      divisionId: step.divisionId || undefined,
      contacts: contactsForTone,
      motion: step.sellingMotion || undefined,
      contentType: step.abmContentType || undefined,
      contentIntent: step.contentIntent || undefined,
      userContext: prompt,
      signalContext: signal
        ? {
            title: stringOrUndefined(signal.title),
            summary: stringOrUndefined(signal.summary),
          }
        : undefined,
      eventContext: event
        ? {
            eventTitle: stringOrUndefined(event.eventTitle),
            eventDate: stringOrUndefined(event.eventDate),
            date: stringOrUndefined(event.date),
            location: stringOrUndefined(event.location),
            description: stringOrUndefined(event.description),
            registrationUrl: stringOrUndefined(event.registrationUrl),
            topics: stringArrayOrUndefined(event.topics),
            speakers: stringArrayOrUndefined(event.speakers),
          }
        : undefined,
    };
    const context = await buildContentContext(generationInput);
    const { raw, parsed, media } = await generateOneContent(generationInput);
    const assetPackage = await buildAssetPackage({
      contextInput: generationInput,
      context,
      generation: { raw, parsed },
    });

    const generatedContent = {
      ...parsed,
      raw,
      media,
      deliveryMode: context.channelConfig.deliveryMode,
      templateType: context.channelConfig.templateType,
      destinationTargets: context.channelConfig.destinationTargets,
      assetPackage,
    };

    const updated = await prisma.actionWorkflowStep.update({
      where: { id: stepId },
      data: {
        status: 'ready',
        generatedContent: generatedContent as import('@prisma/client').Prisma.InputJsonValue,
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

function resolveStepChannel(contentType: string): ChannelId {
  const mapped = playContentTypeToChannel(contentType);
  return getChannelConfig(mapped).id;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function stringArrayOrUndefined(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length > 0 ? items : undefined;
}
