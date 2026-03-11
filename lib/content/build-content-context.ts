import type { ContentHint, ModelTier } from '@/lib/llm/get-model';
import { prisma } from '@/lib/db';
import { getMessagingContextForAgent } from '@/lib/messaging-frameworks';
import {
  getAccountMessagingPromptBlock,
  getActiveObjectionsBlock,
} from '@/lib/account-messaging';
import { getCompanyResearchPromptBlock } from '@/lib/research/company-research-prompt';
import {
  getProductKnowledgeBlock,
  getIndustryPlaybookBlock,
  getCaseStudiesBlock,
  getRelevantProductIdsForIndustry,
  getCompanyEventsBlock,
  getFeatureReleasesBlock,
  getActiveObjectionTexts,
  getExistingProductNames,
} from '@/lib/prompt-context';
import {
  findRelevantContentLibraryChunks,
  formatRAGChunksForPrompt,
} from '@/lib/content-library-rag';
import {
  buildExistingStackBlock,
  resolveProductFraming,
} from '@/lib/products/resolve-product-framing';
import {
  buildRecipientsBlock,
  deriveToneFromContacts,
  getChannelConfig,
  inferSeniority,
  type ChannelId,
} from '@/lib/content/channel-config';
import { getContentIntentPromptSnippet } from '@/lib/content/content-intents';
import {
  getContentTypePromptSnippet,
  type MotionId,
} from '@/lib/content/content-matrix';
import { getPlayPrompt } from '@/lib/content/play-prompts';

export type ContentContextInput = {
  companyId: string;
  userId: string;
  channel: ChannelId;
  divisionId?: string;
  contacts?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
  }>;
  motion?: string;
  playId?: string;
  contentType?: string;
  contentIntent?: string;
  senderRole?: string;
  tone?: string;
  userContext?: string;
  signalContext?: { title?: string; summary?: string };
  eventContext?: {
    eventTitle?: string;
    eventDate?: string;
    date?: string;
    location?: string;
    description?: string;
    registrationUrl?: string;
    topics?: string[];
    speakers?: string[];
  };
  activeActionIndex?: number;
};

export type ContentContextOutput = {
  systemPrompt: string;
  userPrompt: string;
  modelHint?: ContentHint;
  effectiveModelTier: Extract<ModelTier, 'fast' | 'full'>;
  maxOutputTokens: number;
  channelConfig: ReturnType<typeof getChannelConfig>;
};

const SENDER_ROLE_LABELS: Record<string, string> = {
  ae: 'Account Executive — consultative, solution-oriented',
  csm: 'Customer Success Manager — supportive, value-focused, relationship-oriented',
  sdr: 'Sales Development Rep — concise, curiosity-driven, focused on booking meetings',
  executive: 'Executive / VP — strategic, peer-to-peer, brief and high-impact',
};

const TONE_LABELS: Record<string, string> = {
  direct: 'Direct & concise — get to the point quickly, no fluff',
  consultative:
    'Consultative — ask questions, show expertise, guide the conversation',
  friendly: 'Friendly & warm — approachable, personable, human',
  formal: 'Formal — professional, structured, appropriate for executive audiences',
};

export async function buildContentContext(
  input: ContentContextInput,
): Promise<ContentContextOutput> {
  const {
    companyId,
    userId,
    channel,
    divisionId,
    contacts = [],
    motion,
    playId,
    contentType,
    contentIntent,
    senderRole,
    tone,
    userContext,
    signalContext,
    eventContext,
    activeActionIndex,
  } = input;

  const channelConfig = getChannelConfig(channel);
  const tier = channelConfig.contextTier;

  const [company, user] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, userId },
      select: {
        id: true,
        name: true,
        industry: true,
        dealObjective: true,
        dealContext: true,
        accountType: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, companyName: true },
    }),
  ]);

  if (!company) throw new Error('Company not found');

  const aeName = user?.name || 'the sales rep';
  const aeCompany = user?.companyName || '';

  let departmentLabel: string | null = null;
  let divisionIntelLine = '';
  let departmentContext = '';

  if (divisionId) {
    const dept = await prisma.companyDepartment.findFirst({
      where: { id: divisionId, companyId },
      select: {
        valueProp: true,
        useCase: true,
        targetRoles: true,
        customName: true,
        type: true,
        industry: true,
        objectionHandlers: true,
      },
    });

    if (dept) {
      departmentLabel = dept.customName || dept.type.replace(/_/g, ' ');
      departmentContext = `\n\nBUYING GROUP CONTEXT:
- Name: ${departmentLabel}
- Value Proposition: ${dept.valueProp || 'Not specified'}
- Use Case: ${dept.useCase || 'Not specified'}
- Target Roles: ${JSON.stringify(dept.targetRoles || {})}
`;

      const parts: string[] = [];
      if (dept.industry) parts.push(`Industry vertical: ${dept.industry}.`);
      if (dept.useCase) {
        parts.push(`The buyer's division cares about: ${dept.useCase}.`);
      }
      if (dept.valueProp) {
        parts.push(`Our value prop to them: ${dept.valueProp}.`);
      }

      const rawObjections = dept.objectionHandlers;
      if (Array.isArray(rawObjections) && rawObjections.length > 0) {
        parts.push(
          `Known objections: ${(
            rawObjections as Array<{ objection: string; response: string }>
          )
            .map((o) => `"${o.objection}" → ${o.response}`)
            .join('; ')}.`,
        );
      }
      if (parts.length > 0) divisionIntelLine = parts.join(' ') + '\n';
    }
  }

  const recipientsSection = buildRecipientsBlock(contacts, channelConfig.mode);
  const toneLine = deriveToneFromContacts(contacts);

  const include = {
    research: tier !== 'light',
    account: tier !== 'light',
    product: tier !== 'light',
    playbook: tier !== 'light',
    caseStudies: tier === 'deep',
    events: tier !== 'light',
    featureReleases: tier === 'deep',
    messaging: tier !== 'light',
    rag: tier !== 'light',
    existingStack: tier !== 'light',
    productFraming: tier !== 'light',
  };

  const [
    researchBlock,
    accountBlock,
    activeObjectionsBlock,
    messagingSection,
    relevantProductIds,
    objectionTexts,
    productNames,
  ] = await Promise.all([
    include.research
      ? getCompanyResearchPromptBlock(companyId, userId)
      : Promise.resolve(''),
    include.account
      ? getAccountMessagingPromptBlock(companyId, userId)
      : Promise.resolve(''),
    getActiveObjectionsBlock(companyId, userId, divisionId),
    include.messaging
      ? getMessagingContextForAgent(userId, company.industry ?? undefined)
      : Promise.resolve(''),
    include.product || include.caseStudies || include.productFraming
      ? getRelevantProductIdsForIndustry(userId, company.industry ?? null, null)
      : Promise.resolve([]),
    include.events
      ? getActiveObjectionTexts(companyId, userId)
      : Promise.resolve([]),
    include.events
      ? getExistingProductNames(companyId, userId)
      : Promise.resolve([]),
  ]);

  const [
    productKnowledgeBlock,
    industryPlaybookBlock,
    caseStudiesBlock,
    eventsBlock,
    featureReleasesBlock,
    playbook,
  ] = await Promise.all([
    include.product
      ? getProductKnowledgeBlock(
          userId,
          relevantProductIds.length > 0 ? relevantProductIds : undefined,
        )
      : Promise.resolve(''),
    include.playbook
      ? getIndustryPlaybookBlock(userId, company.industry ?? null)
      : Promise.resolve(''),
    include.caseStudies
      ? getCaseStudiesBlock(
          userId,
          company.industry ?? null,
          departmentLabel,
          relevantProductIds,
        )
      : Promise.resolve(''),
    include.events
      ? getCompanyEventsBlock(
          userId,
          company.industry ?? null,
          departmentLabel,
          null,
          {
            activeObjections: objectionTexts,
            existingProducts: productNames,
          },
        )
      : Promise.resolve(''),
    include.featureReleases
      ? getFeatureReleasesBlock(userId, company.industry ?? null, 10)
      : Promise.resolve(''),
    include.playbook && company.industry
      ? prisma.industryPlaybook.findFirst({
          where: { userId },
          select: { landmines: true },
        })
      : Promise.resolve(null),
  ]);

  let ragSection = '';
  if (include.rag) {
    const ragQueryParts = [company.name, company.industry ?? ''];
    if (departmentLabel) ragQueryParts.push(departmentLabel);
    ragQueryParts.push('value proposition');
    const ragQuery = ragQueryParts.filter(Boolean).join(' ');
    const ragChunkCount = departmentLabel ? 4 : 8;
    const ragChunks = await findRelevantContentLibraryChunks(
      userId,
      ragQuery,
      ragChunkCount,
    );
    ragSection =
      ragChunks.length > 0
        ? `\n\n${formatRAGChunksForPrompt(ragChunks)}`
        : '';
  }

  const existingStackSection = include.existingStack
    ? await buildExistingStackBlock(companyId, userId)
    : '';
  const existingStackLine = existingStackSection
    ? `\n${existingStackSection}\n`
    : '';

  let productFramingLine = '';
  if (include.productFraming && relevantProductIds[0]) {
    try {
      const framing = await resolveProductFraming(companyId, relevantProductIds[0]);
      productFramingLine = `\nPRODUCT FRAMING (${framing.framing}): ${framing.context}\n`;
    } catch {
      // Non-critical enrichment.
    }
  }

  let dealContextLine = '';
  if (company.accountType) {
    const typeLabels: Record<string, string> = {
      partner: 'Partner',
      customer: 'Existing Customer',
      new_logo: 'New Logo',
      prospect: 'Prospect',
    };
    const label = typeLabels[company.accountType] ?? company.accountType;
    dealContextLine += `\nACCOUNT TYPE: ${label}${
      company.accountType === 'partner'
        ? ' — use peer-to-peer tone, not vendor-to-buyer.'
        : ''
    }\n`;
  }
  if (company.dealObjective) {
    dealContextLine += `\nDEAL OBJECTIVE: ${company.dealObjective}\n`;
  }
  if (company.dealContext && typeof company.dealContext === 'object') {
    const dc = company.dealContext as Record<string, unknown>;
    const parts: string[] = [];
    if (dc.dealShape) parts.push(`Deal shape: ${dc.dealShape}`);
    if (dc.buyingMotion) parts.push(`Buying motion: ${dc.buyingMotion}`);
    if (dc.accountStatus) parts.push(`Account status: ${dc.accountStatus}`);
    if (dc.dealGoal) parts.push(`Deal goal: ${dc.dealGoal}`);
    if (Array.isArray(dc.targetDivisions) && dc.targetDivisions.length > 0) {
      parts.push(`Target divisions: ${dc.targetDivisions.join(', ')}`);
    }
    if (parts.length > 0) {
      dealContextLine += `\nSTRATEGIC ACCOUNT PLAN:\n${parts.join('\n')}\n`;
    }
  }

  const researchSection =
    include.research && researchBlock ? `\n\n${researchBlock}` : '';
  const accountSection =
    include.account && accountBlock ? `\n\n${accountBlock}` : '';
  const activeObjectionsSection = activeObjectionsBlock
    ? `\n\n${activeObjectionsBlock}`
    : '';
  const productSection =
    include.product && productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
  const playbookSection =
    include.playbook && industryPlaybookBlock
      ? `\n\n${industryPlaybookBlock}`
      : '';
  const caseStudiesSection =
    include.caseStudies && caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';
  const eventsSection =
    include.events && eventsBlock ? `\n\n${eventsBlock}` : '';
  const featureReleasesSection =
    include.featureReleases && featureReleasesBlock
      ? `\n\n${featureReleasesBlock}`
      : '';
  const messagingSectionFinal =
    include.messaging && messagingSection ? messagingSection : '';

  const aeIdentityLine = aeCompany
    ? `You are writing on behalf of ${aeName} at ${aeCompany}.\n`
    : `You are writing on behalf of ${aeName}.\n`;

  const senderRoleLine =
    senderRole && SENDER_ROLE_LABELS[senderRole]
      ? `Sender role: ${SENDER_ROLE_LABELS[senderRole]}. Write from this perspective.\n`
      : '';

  const requestedToneLine =
    tone && TONE_LABELS[tone]
      ? `Requested tone: ${TONE_LABELS[tone]}.\n`
      : '';

  const intentSnippet = getContentIntentPromptSnippet(
    contentIntent || 'introduction',
    channel,
  );
  const intentLine = intentSnippet ? `Content intent: ${intentSnippet}\n` : '';

  const matrixSnippet = contentType
    ? getContentTypePromptSnippet(contentType, motion as MotionId | undefined)
    : '';
  const matrixLine = matrixSnippet
    ? `ABM content type: ${matrixSnippet}\n`
    : '';

  const userContextLine = userContext?.trim()
    ? `The user provided this specific context for the outreach: "${userContext.trim()}". Incorporate this intent into the content.\n`
    : '';

  const playPrompt = playId ? getPlayPrompt(motion || '', playId) : '';
  const playLine = playPrompt ? `\n${playPrompt}\n` : '';

  const signalLine = signalContext
    ? `\nTriggering signal: ${signalContext.title || ''} — ${
        signalContext.summary || ''
      }\n`
    : '';

  let eventLine = '';
  if (eventContext) {
    const parts = [`Event: ${eventContext.eventTitle || ''}`];
    if (eventContext.eventDate || eventContext.date) {
      parts.push(`Date: ${eventContext.eventDate || eventContext.date}`);
    }
    if (eventContext.location) parts.push(`Location: ${eventContext.location}`);
    if (eventContext.description) {
      parts.push(`Description: ${eventContext.description}`);
    }
    if (eventContext.registrationUrl) {
      parts.push(`Registration: ${eventContext.registrationUrl}`);
    }
    if (eventContext.topics?.length) {
      parts.push(`Topics/Sessions: ${eventContext.topics.join(', ')}`);
    }
    if (eventContext.speakers?.length) {
      parts.push(`Speakers: ${eventContext.speakers.join(', ')}`);
    }
    eventLine = '\n' + parts.join('\n') + '\n';
  }

  let actionLine = '';
  if (activeActionIndex != null) {
    const actionLabels = [
      'Introduce relevant capabilities',
      'Reference the triggering event or signal',
      'Propose a brief introductory meeting',
      'Share a relevant case study or proof point',
      'Invite to an upcoming event or session',
    ];
    const actionText =
      actionLabels[activeActionIndex] ?? `action #${activeActionIndex + 1}`;
    actionLine = `Frame this outreach around the following chosen action: "${actionText}".\n`;
  }

  const landminesArr = Array.isArray(playbook?.landmines)
    ? (playbook.landmines as string[])
    : [];
  const defaultLandmines = [
    'use generic openers like "I hope this email finds you well"',
    'lead with your product name before establishing relevance',
  ];
  const allLandmines =
    landminesArr.length > 0 ? landminesArr : defaultLandmines;
  const landminesLine = `Do NOT: ${allLandmines.join('; ')}.\n`;

  const channelInstruction = channelConfig.buildInstruction(company.name);

  const systemPrompt = `You are a B2B sales content writer.
${aeIdentityLine}${senderRoleLine}${requestedToneLine}${intentLine}${matrixLine}${actionLine}${userContextLine}${toneLine}${landminesLine}${divisionIntelLine}${playLine}${signalLine}${eventLine}
The user is creating ${channelConfig.label} content for the target account "${company.name}".
${departmentContext}${recipientsSection}
${dealContextLine}${productFramingLine}${existingStackLine}
Context below includes:
1) TARGET ACCOUNT: research and account messaging for ${company.name}.
2) YOUR COMPANY: messaging framework, product knowledge, industry playbook, case studies, upcoming events, and feature releases.
3) CONTENT LIBRARY: relevant snippets for this use case.
${activeObjectionsSection}
${ragSection}
--- YOUR COMPANY CONTEXT (cacheable) ---
${productSection}
${playbookSection}
${caseStudiesSection}
${eventsSection}
${featureReleasesSection}
${messagingSectionFinal}
--- TARGET ACCOUNT CONTEXT ---
${accountSection}${researchSection}
${channelInstruction}`;

  const recipientMaxSeniority = contacts.reduce(
    (max, contact) => Math.max(max, inferSeniority(contact.title)),
    0,
  );
  let effectiveModelTier: Extract<ModelTier, 'fast' | 'full'> =
    channelConfig.modelTier;
  if (senderRole === 'executive' || recipientMaxSeniority >= 4) {
    effectiveModelTier = 'full';
  }

  return {
    systemPrompt,
    userPrompt: channelConfig.buildUserPrompt(),
    modelHint: channelConfig.modelHint,
    effectiveModelTier,
    maxOutputTokens: channelConfig.maxOutputTokens,
    channelConfig,
  };
}
