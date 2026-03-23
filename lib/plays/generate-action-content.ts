/**
 * Generates content for a PlayAction using its ContentTemplate: builds context from
 * company/template, calls the content pipeline, updates PlayAction and creates ContentGenerationLog.
 * When ContentTemplate.contentGenerationType is set, uses the prompt from content-generation-types.
 */

import type { ChannelId } from '@/lib/content/channel-config';
import { generateOneContent } from '@/lib/content/generate-content';
import { prisma } from '@/lib/db';
import { getPromptTemplateForType } from './content-generation-types';

/** Hard cap per field for contact / JSON intel appended to userContext (token budget). */
const CONTACT_INTEL_FIELD_MAX = 500;

/** Capped blocks appended to userContext (recent signals, engagement lines, objections). */
const SIGNAL_SNIPPET_MAX = 200;
const ACTIVITY_SNIPPET_MAX = 200;
const OBJECTION_SNIPPET_MAX = 200;

function capIntelText(s: string | null | undefined): string {
  const t = (s ?? '').trim();
  if (t.length <= CONTACT_INTEL_FIELD_MAX) return t;
  return `${t.slice(0, CONTACT_INTEL_FIELD_MAX)}…`;
}

function capSnippet(s: string | null | undefined, max: number): string {
  const t = (s ?? '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

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

/** Substitute {{account.name}}, {{contact.name}}, {{signal.summary}}, etc. in the template prompt. */
function substitutePromptTemplate(
  promptTemplate: string,
  context: {
    companyName?: string;
    valueNarrative?: string;
    renewalMessaging?: string;
    competitiveRules?: string;
    brandVoice?: string;
    contactName?: string;
    contactTitle?: string;
    signalSummary?: string;
    signalTitle?: string;
    divisionName?: string;
  },
): string {
  return promptTemplate
    .replace(/\{\{account\.name\}\}/g, context.companyName ?? '{{account.name}}')
    .replace(/\{\{governance\.valueNarrative\}\}/g, context.valueNarrative ?? '')
    .replace(/\{\{governance\.renewalMessaging\}\}/g, context.renewalMessaging ?? '')
    .replace(/\{\{governance\.competitiveRules\}\}/g, context.competitiveRules ?? '')
    .replace(/\{\{governance\.brandVoice\}\}/g, context.brandVoice ?? '')
    .replace(/\{\{contact\.name\}\}/g, context.contactName ?? '{{contact.name}}')
    .replace(/\{\{contact\.title\}\}/g, context.contactTitle ?? '{{contact.title}}')
    .replace(/\{\{signal\.summary\}\}/g, context.signalSummary ?? '')
    .replace(/\{\{signal\.title\}\}/g, context.signalTitle ?? '')
    .replace(/\{\{division\.name\}\}/g, context.divisionName ?? '{{division.name}}');
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
  type PlayRunWithCompany = { userId: string; company: { id: string; name: string | null }; accountSignalId: string | null };
  type ActionWithInclude = typeof action & {
    phaseRun: { playRun: PlayRunWithCompany } | null;
    contentTemplate: {
      id: string;
      name: string;
      contentType: string;
      channel?: string | null;
      promptTemplate: string;
      systemInstructions?: string | null;
      governanceRules?: string | null;
      approvedMessaging?: string | null;
      prohibitedContent?: string | null;
      modelTier: string;
      contextSources: string[];
      contentGenerationType?: string;
    } | null;
  };
  const act = action as ActionWithInclude;
  const playRun = act.phaseRun?.playRun;
  if (!playRun || playRun.userId !== userId) throw new Error('Unauthorized');
  const template = act.contentTemplate;
  if (!template) throw new Error('PlayAction has no ContentTemplate');

  const company = playRun.company;
  const companyId = company.id;

  let divisionName: string | undefined;
  let divisionId: string | undefined;
  let roadmapIntelExtra = '';
  const runWithTarget = playRun as { roadmapTargetId?: string | null };
  if (runWithTarget.roadmapTargetId) {
    const target = await prisma.roadmapTarget.findUnique({
      where: { id: runWithTarget.roadmapTargetId },
      select: { name: true, companyDepartmentId: true, intelligence: true },
    });
    if (target?.name) divisionName = target.name;
    if (target?.companyDepartmentId) divisionId = target.companyDepartmentId;
    if (target?.intelligence != null) {
      const intelStr =
        typeof target.intelligence === 'string'
          ? target.intelligence
          : JSON.stringify(target.intelligence);
      const capped = capIntelText(intelStr);
      if (capped) {
        roadmapIntelExtra = `\n\nRoadmap / account focus (from strategic plan):\n${capped}`;
      }
    }
  }

  let signalSummary = '';
  let signalTitle: string | undefined;
  let signalContext: { title?: string; summary?: string } | undefined;
  if (playRun.accountSignalId) {
    const sig = await prisma.accountSignal.findUnique({
      where: { id: playRun.accountSignalId },
      select: { title: true, summary: true },
    });
    if (sig) {
      signalSummary = sig.summary ?? sig.title ?? '';
      signalTitle = sig.title ?? undefined;
      signalContext = {
        title: sig.title ?? undefined,
        summary: sig.summary ?? undefined,
      };
    }
  }

  const channelId = playContentTypeToChannelId(template.contentType, template.channel ?? undefined);

  const contacts: Array<{
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
  }> = [];

  let contactIntelExtra = '';
  let resolvedContactId: string | null = null;
  const emailTrim = action.contactEmail?.trim();
  if (emailTrim) {
    const dbContact = await prisma.contact.findFirst({
      where: {
        companyId,
        email: { equals: emailTrim, mode: 'insensitive' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        bio: true,
        enrichedData: true,
      },
    });
    if (dbContact) {
      resolvedContactId = dbContact.id;
      contacts.push({
        firstName: dbContact.firstName,
        lastName: dbContact.lastName,
        title: dbContact.title ?? action.contactTitle ?? null,
      });
      const parts: string[] = [];
      if (dbContact.bio?.trim()) {
        parts.push(`Bio: ${capIntelText(dbContact.bio)}`);
      }
      if (dbContact.enrichedData != null) {
        const edStr =
          typeof dbContact.enrichedData === 'string'
            ? dbContact.enrichedData
            : JSON.stringify(dbContact.enrichedData);
        parts.push(`Enrichment: ${capIntelText(edStr)}`);
      }
      if (parts.length) {
        contactIntelExtra = `\n\nContact intel:\n${parts.join('\n')}`;
      }
    }
  }
  if (contacts.length === 0 && (action.contactName || action.contactTitle)) {
    const parts = (action.contactName ?? '').split(/\s+/);
    contacts.push({
      firstName: parts[0] ?? null,
      lastName: parts.slice(1).join(' ') || null,
      title: action.contactTitle ?? null,
    });
  }

  const recentSignals = await prisma.accountSignal.findMany({
    where: { companyId, userId },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { title: true, summary: true },
  });
  let recentSignalsExtra = '';
  if (recentSignals.length) {
    const lines = recentSignals.map((s) => {
      const title = capSnippet(s.title, SIGNAL_SNIPPET_MAX);
      const sum = s.summary ? capSnippet(s.summary, SIGNAL_SNIPPET_MAX) : '';
      return sum ? `- ${title}: ${sum}` : `- ${title}`;
    });
    recentSignalsExtra = `\n\nRecent signals:\n${lines.join('\n')}`;
  }

  let recentEngagementExtra = '';
  if (resolvedContactId) {
    const acts = await prisma.activity.findMany({
      where: { contactId: resolvedContactId, userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { type: true, createdAt: true, summary: true },
    });
    if (acts.length) {
      const lines = acts.map(
        (a) =>
          `- ${capSnippet(a.type, ACTIVITY_SNIPPET_MAX)} @ ${a.createdAt.toISOString()}: ${capSnippet(a.summary, ACTIVITY_SNIPPET_MAX)}`,
      );
      recentEngagementExtra = `\n\nRecent engagement:\n${lines.join('\n')}`;
    }
  }

  const companyRow = await prisma.company.findUnique({
    where: { id: companyId },
    select: { activeObjections: true },
  });
  let knownObjectionsExtra = '';
  const objectionsRaw = companyRow?.activeObjections;
  if (objectionsRaw != null && Array.isArray(objectionsRaw) && objectionsRaw.length > 0) {
    const top = objectionsRaw.slice(0, 3);
    const lines: string[] = [];
    for (const item of top) {
      if (item && typeof item === 'object' && item !== null && 'objection' in item) {
        lines.push(
          `- ${capSnippet(String((item as { objection: unknown }).objection), OBJECTION_SNIPPET_MAX)}`,
        );
      } else {
        lines.push(`- ${capSnippet(JSON.stringify(item), OBJECTION_SNIPPET_MAX)}`);
      }
    }
    if (lines.length) {
      knownObjectionsExtra = `\n\nKnown objections:\n${lines.join('\n')}`;
    }
  }

  let valueNarrative = '';
  let renewalMessaging = '';
  let competitiveRules = '';
  let brandVoice = '';
  try {
    const governance = await prisma.playGovernance.findUnique({
      where: { userId },
      select: {
        valueNarrative: true,
        renewalMessaging: true,
        competitiveRules: true,
        brandVoice: true,
      },
    });
    valueNarrative = (governance?.valueNarrative as string) ?? '';
    renewalMessaging = (governance?.renewalMessaging as string) ?? '';
    competitiveRules =
      typeof governance?.competitiveRules === 'object'
        ? JSON.stringify(governance.competitiveRules)
        : (governance?.competitiveRules as string) ?? '';
    brandVoice = (governance?.brandVoice as string) ?? '';
  } catch {
    // optional
  }

  let promptToUse = template.promptTemplate;
  const contentGenType =
    (template as { contentGenerationType?: string }).contentGenerationType;
  if (contentGenType) {
    const typePrompt = getPromptTemplateForType(contentGenType);
    if (typePrompt) {
      promptToUse =
        contentGenType === 'custom_content'
          ? typePrompt.replace(
              '{{userInstructions}}',
              template.promptTemplate || template.name,
            )
          : typePrompt;
    }
  }
  const userContext =
    substitutePromptTemplate(promptToUse, {
      companyName: company.name ?? undefined,
      valueNarrative,
      renewalMessaging,
      competitiveRules,
      brandVoice,
      contactName: action.contactName ?? undefined,
      contactTitle: action.contactTitle ?? undefined,
      signalSummary: signalSummary || undefined,
      signalTitle,
      divisionName,
    }) +
    contactIntelExtra +
    roadmapIntelExtra +
    recentSignalsExtra +
    recentEngagementExtra +
    knownObjectionsExtra;

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
    divisionId,
    contacts: contacts.length ? contacts : undefined,
    userContext,
    signalContext,
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
          contentType: (template as { contentType: string }).contentType,
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
