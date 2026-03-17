/**
 * Generates content for a PlayAction using its ContentTemplate: builds context from
 * company/template, calls the content pipeline, updates PlayAction and creates ContentGenerationLog.
 */

import type { ChannelId } from '@/lib/content/channel-config';
import { generateOneContent } from '@/lib/content/generate-content';
import { prisma } from '@/lib/db';

export type GeneratePlayActionContentInput = {
  actionId: string;
  userId: string;
};

/** Map PlayContentType (and ContentChannel) to ChannelId for buildContentContext. */
function playContentTypeToChannelId(contentType: string, channel?: string | null): ChannelId {
  const typeMap: Record<string, ChannelId> = {
    EMAIL: 'email',
    LINKEDIN_MSG: 'linkedin_inmail',
    LINKEDIN_POST: 'linkedin_post',
    DECK: 'presentation',
    BRIEF: 'talk_track',
    PROPOSAL: 'presentation',
    BATTLE_CARD: 'talk_track',
    INTERNAL_NOTE: 'talk_track',
    SLACK_MSG: 'slack',
    CHAMPION_ENABLEMENT: 'champion_enablement',
    EBR_DECK: 'qbr_ebr_script',
  };
  const upper = contentType.toUpperCase().replace(/-/g, '_');
  if (typeMap[upper]) return typeMap[upper];
  if (channel) {
    const ch = channel.toLowerCase();
    if (ch === 'email') return 'email';
    if (ch === 'linkedin' || ch === 'linkedin_inmail') return 'linkedin_inmail';
    if (ch === 'presentation') return 'presentation';
    if (ch === 'slack') return 'slack';
  }
  return 'email';
}

/** Substitute {{account.name}} and similar in the template prompt. */
function substitutePromptTemplate(
  promptTemplate: string,
  context: { companyName?: string; valueNarrative?: string },
): string {
  return promptTemplate
    .replace(/\{\{account\.name\}\}/g, context.companyName ?? '{{account.name}}')
    .replace(/\{\{governance\.valueNarrative\}\}/g, context.valueNarrative ?? '');
}

export async function generatePlayActionContent(input: GeneratePlayActionContentInput) {
  const { actionId, userId } = input;
  const startMs = Date.now();

  const action = await prisma.playAction.findFirst({
    where: { id: actionId },
    include: {
      phaseRun: {
        include: {
          playRun: {
            include: {
              company: {
                select: { id: true, name: true, industry: true, dealObjective: true },
              },
            },
          },
        },
      },
      contentTemplate: true,
    },
  });

  if (!action) throw new Error('PlayAction not found');
  if (action.phaseRun.playRun.userId !== userId) throw new Error('Unauthorized');
  if (!action.contentTemplate) throw new Error('PlayAction has no ContentTemplate');

  const template = action.contentTemplate;
  const company = action.phaseRun.playRun.company;
  const companyId = company.id;

  const channelId = playContentTypeToChannelId(template.contentType, template.channel ?? undefined);

  const contacts = [];
  if (action.contactName || action.contactTitle) {
    const parts = (action.contactName ?? '').split(/\s+/);
    contacts.push({
      firstName: parts[0] ?? null,
      lastName: parts.slice(1).join(' ') || null,
      title: action.contactTitle ?? null,
    });
  }

  let valueNarrative = '';
  try {
    const governance = await prisma.playGovernance.findUnique({
      where: { userId },
      select: { valueNarrative: true },
    });
    valueNarrative = (governance?.valueNarrative as string) ?? '';
  } catch {
    // optional
  }

  const userContext = substitutePromptTemplate(template.promptTemplate, {
    companyName: company.name ?? undefined,
    valueNarrative,
  });

  const systemSuffix = [
    template.systemInstructions,
    template.governanceRules ? `Governance: ${template.governanceRules}` : '',
    template.approvedMessaging ? `Approved messaging: ${template.approvedMessaging}` : '',
    template.prohibitedContent ? `Avoid: ${template.prohibitedContent}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const generationInput = {
    companyId,
    userId,
    channel: channelId,
    contacts: contacts.length ? contacts : undefined,
    userContext,
    signalContext: undefined,
    eventContext: undefined,
  };

  const userContextWithSystem = [
    userContext,
    systemSuffix ? `Additional instructions:\n${systemSuffix}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const finalInput = { ...generationInput, userContext: userContextWithSystem };

  try {
    const { raw: finalRaw, parsed: finalParsed, usage: finalUsage } =
      await generateOneContent(finalInput);

    const durationMs = Date.now() - startMs;
    const subject =
      typeof finalParsed.subject === 'string'
        ? finalParsed.subject
        : (finalParsed as Record<string, unknown>).subject as string | undefined;
    const body =
      typeof finalParsed.body === 'string'
        ? finalParsed.body
        : (finalParsed as Record<string, unknown>).body as string | undefined;

    await prisma.playAction.update({
      where: { id: actionId },
      data: {
        generatedContent: body ?? finalRaw,
        generatedSubject: subject ?? undefined,
        modelUsed: template.modelTier,
        tokensUsed: finalUsage?.totalTokens ?? undefined,
        generatedAt: new Date(),
        contextSnapshot: {
          companyName: company.name,
          contentType: template.contentType,
          channel: channelId,
        } as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    await prisma.contentTemplate.update({
      where: { id: template.id },
      data: { timesGenerated: { increment: 1 } },
    });

    await prisma.contentGenerationLog.create({
      data: {
        userId,
        playActionId: actionId,
        contentTemplateId: template.id,
        contentTemplateName: template.name,
        modelTier: template.modelTier,
        promptTokens: finalUsage?.promptTokens ?? 0,
        completionTokens: finalUsage?.completionTokens ?? 0,
        totalTokens: finalUsage?.totalTokens ?? 0,
        cachedTokens: 0,
        contextSources: template.contextSources,
        status: 'SUCCESS',
        durationMs,
      },
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.contentGenerationLog.create({
      data: {
        userId,
        playActionId: actionId,
        contentTemplateId: template.id,
        contentTemplateName: template.name,
        modelTier: template.modelTier,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cachedTokens: 0,
        contextSources: template.contextSources,
        status: 'FAILED',
        durationMs,
        errorMessage: message,
      },
    });
    throw err;
  }

  const updated = await prisma.playAction.findUnique({
    where: { id: actionId },
    include: { contentTemplate: { select: { name: true, contentType: true } } },
  });
  return updated!;
}
