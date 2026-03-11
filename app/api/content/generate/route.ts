import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { getMessagingContextForAgent } from '@/lib/messaging-frameworks';
import { getAccountMessagingPromptBlock, getActiveObjectionsBlock } from '@/lib/account-messaging';
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
import { buildExistingStackBlock } from '@/lib/products/resolve-product-framing';
import {
  getChannelConfig,
  buildRecipientsBlock,
  deriveToneFromContacts,
} from '@/lib/content/channel-config';
import { getContentIntentPromptSnippet, CONTENT_INTENT_IDS } from '@/lib/content/content-intents';
import { getContentTypePromptSnippet, type MotionId } from '@/lib/content/content-matrix';

const GenerateSchema = z.object({
  companyId: z.string(),
  divisionId: z.string().optional(),
  channel: z.enum([
    'email',
    'linkedin_inmail',
    'linkedin_post',
    'slack',
    'sms',
    'sales_page',
    'presentation',
    'ad_brief',
    'demo_script',
    'video',
    'one_pager',
    'talk_track',
    'champion_enablement',
    'map',
    'qbr_ebr_script',
  ]),
  contactIds: z.array(z.string()).optional(),
  triggerId: z.string().optional(),
  activeActionIndex: z.number().int().min(0).optional(),
  userContext: z.string().max(1000).optional(),
  contentIntent: z.enum(CONTENT_INTENT_IDS).optional(),
  motion: z.string().optional(),
  contentType: z.string().optional(),
  senderRole: z.string().optional(),
  tone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = GenerateSchema.parse(json);
    const { companyId, divisionId, channel } = input;

    const channelConfig = getChannelConfig(channel);

    const [company, user] = await Promise.all([
      prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        select: { id: true, name: true, industry: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, companyName: true },
      }),
    ]);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const aeName = user?.name || 'the sales rep';
    const aeCompany = user?.companyName || '';

    // Buying group / division context
    let departmentContext = '';
    let departmentLabel: string | null = null;
    let divisionValuProp: string | null = null;
    let divisionUseCase: string | null = null;
    let divisionObjectionHandlers: Array<{ objection: string; response: string }> | null = null;
    if (divisionId) {
      const department = await prisma.companyDepartment.findFirst({
        where: { id: divisionId, companyId },
        select: {
          valueProp: true,
          useCase: true,
          targetRoles: true,
          customName: true,
          type: true,
          objectionHandlers: true,
        },
      });
      if (department) {
        departmentLabel = department.customName || department.type.replace(/_/g, ' ');
        divisionValuProp = department.valueProp;
        divisionUseCase = department.useCase;
        const rawOH = department.objectionHandlers;
        if (Array.isArray(rawOH) && rawOH.length > 0) {
          divisionObjectionHandlers = rawOH as Array<{ objection: string; response: string }>;
        }
        departmentContext = `\n\nBUYING GROUP CONTEXT:
- Name: ${departmentLabel}
- Value Proposition: ${department.valueProp || 'Not specified'}
- Use Case: ${department.useCase || 'Not specified'}
- Target Roles: ${JSON.stringify(department.targetRoles || {})}
`;
      }
    }

    // Fetch contacts for recipient context + seniority-based tone
    type ContactRow = { firstName: string | null; lastName: string | null; title: string | null };
    let contacts: ContactRow[] = [];
    if (input.contactIds && input.contactIds.length > 0) {
      contacts = await prisma.contact.findMany({
        where: { companyId, id: { in: input.contactIds } },
        select: { firstName: true, lastName: true, title: true },
      });
    }

    const recipientsSection = buildRecipientsBlock(contacts, channelConfig.mode);
    const toneLine = deriveToneFromContacts(contacts);

    const [researchBlock, accountBlock, activeObjectionsBlock, messagingSection, relevantProductIds, objectionTexts, productNames] =
      await Promise.all([
        getCompanyResearchPromptBlock(companyId, session.user.id),
        getAccountMessagingPromptBlock(companyId, session.user.id),
        getActiveObjectionsBlock(companyId, session.user.id, divisionId),
        getMessagingContextForAgent(session.user.id, company.industry ?? undefined),
        getRelevantProductIdsForIndustry(
          session.user.id,
          company.industry ?? null,
          null
        ),
        getActiveObjectionTexts(companyId, session.user.id),
        getExistingProductNames(companyId, session.user.id),
      ]);

    const [productKnowledgeBlock, industryPlaybookBlock, caseStudiesBlock, eventsBlock, featureReleasesBlock, playbook] =
      await Promise.all([
        getProductKnowledgeBlock(
          session.user.id,
          relevantProductIds.length > 0 ? relevantProductIds : undefined
        ),
        getIndustryPlaybookBlock(session.user.id, company.industry ?? null),
        getCaseStudiesBlock(
          session.user.id,
          company.industry ?? null,
          departmentLabel,
          relevantProductIds
        ),
        getCompanyEventsBlock(session.user.id, company.industry ?? null, departmentLabel, null, {
          activeObjections: objectionTexts,
          existingProducts: productNames,
        }),
        getFeatureReleasesBlock(session.user.id, company.industry ?? null, 10),
        company.industry
          ? prisma.industryPlaybook.findFirst({
              where: { userId: session.user.id },
              select: { landmines: true },
            })
          : Promise.resolve(null),
      ]);

    // Context tiering — short-form channels get less context to avoid drowning the instruction
    const isShortForm = ['sms', 'slack'].includes(channel);
    const isMediumForm = ['linkedin_post', 'linkedin_inmail'].includes(channel);

    const researchSection = researchBlock && !isShortForm ? `\n\n${researchBlock}` : '';
    const accountSection = accountBlock && !isShortForm ? `\n\n${accountBlock}` : '';
    const activeObjectionsSection = activeObjectionsBlock ? `\n\n${activeObjectionsBlock}` : '';
    const productSection = productKnowledgeBlock && !isShortForm ? `\n\n${productKnowledgeBlock}` : '';
    const playbookSection = industryPlaybookBlock && !isShortForm
      ? `\n\n${industryPlaybookBlock}`
      : '';
    const caseStudiesSection = caseStudiesBlock && !isShortForm && !isMediumForm
      ? `\n\n${caseStudiesBlock}`
      : '';
    const eventsSection = eventsBlock && !isShortForm ? `\n\n${eventsBlock}` : '';
    const featureReleasesSection = featureReleasesBlock && !isShortForm
      ? `\n\n${featureReleasesBlock}`
      : '';

    const ragQueryParts = [company.name, company.industry ?? ''];
    if (departmentLabel) ragQueryParts.push(departmentLabel);
    ragQueryParts.push('value proposition');
    const ragQuery = ragQueryParts.filter(Boolean).join(' ');
    const ragChunkCount = departmentLabel ? 4 : 8;
    const ragChunks = isShortForm
      ? []
      : await findRelevantContentLibraryChunks(session.user.id, ragQuery, ragChunkCount);
    const ragSection =
      ragChunks.length > 0
        ? `\n\n${formatRAGChunksForPrompt(ragChunks)}`
        : '';

    const aeIdentityLine = aeCompany
      ? `You are writing on behalf of ${aeName} at ${aeCompany}.\n`
      : `You are writing on behalf of ${aeName}.\n`;

    let actionLine = '';
    if (input.activeActionIndex != null) {
      const actionLabels = [
        'Introduce relevant capabilities',
        'Reference the triggering event or signal',
        'Propose a brief introductory meeting',
        'Share a relevant case study or proof point',
        'Invite to an upcoming event or session',
      ];
      const actionText = actionLabels[input.activeActionIndex] ?? `action #${input.activeActionIndex + 1}`;
      actionLine = `Frame this outreach around the following chosen action: "${actionText}".\n`;
    }

    const intentSnippet = getContentIntentPromptSnippet(input.contentIntent || 'introduction', channel);
    const intentLine = intentSnippet
      ? `Content intent: ${intentSnippet}\n`
      : '';

    const matrixSnippet = input.contentType
      ? getContentTypePromptSnippet(input.contentType, input.motion as MotionId | undefined)
      : '';
    const matrixLine = matrixSnippet
      ? `ABM content type: ${matrixSnippet}\n`
      : '';

    const userContextLine = input.userContext?.trim()
      ? `The user provided this specific context for the outreach: "${input.userContext.trim()}". Incorporate this intent into the content.\n`
      : '';

    const SENDER_ROLE_LABELS: Record<string, string> = {
      ae: 'Account Executive — consultative, solution-oriented',
      csm: 'Customer Success Manager — supportive, value-focused, relationship-oriented',
      sdr: 'Sales Development Rep — concise, curiosity-driven, focused on booking meetings',
      executive: 'Executive / VP — strategic, peer-to-peer, brief and high-impact',
    };
    const TONE_LABELS: Record<string, string> = {
      direct: 'Direct & concise — get to the point quickly, no fluff',
      consultative: 'Consultative — ask questions, show expertise, guide the conversation',
      friendly: 'Friendly & warm — approachable, personable, human',
      formal: 'Formal — professional, structured, appropriate for executive audiences',
    };
    const senderRoleLine = input.senderRole && SENDER_ROLE_LABELS[input.senderRole]
      ? `Sender role: ${SENDER_ROLE_LABELS[input.senderRole]}. Write from this perspective.\n`
      : '';
    const requestedToneLine = input.tone && TONE_LABELS[input.tone]
      ? `Requested tone: ${TONE_LABELS[input.tone]}.\n`
      : '';

    const landminesArr = Array.isArray(playbook?.landmines) ? (playbook.landmines as string[]) : [];
    const defaultLandmines = ['use generic openers like "I hope this email finds you well"', 'lead with your product name before establishing relevance'];
    const allLandmines = landminesArr.length > 0 ? landminesArr : defaultLandmines;
    const landminesLine = `Do NOT: ${allLandmines.join('; ')}.\n`;

    const existingStackSection = await buildExistingStackBlock(companyId, session.user.id);
    const existingStackLine = existingStackSection ? `\n${existingStackSection}\n` : '';

    let divisionIntelLine = '';
    if (divisionValuProp || divisionUseCase || divisionObjectionHandlers) {
      const parts: string[] = [];
      if (divisionUseCase) parts.push(`The buyer's division cares about: ${divisionUseCase}.`);
      if (divisionValuProp) parts.push(`Our value prop to them: ${divisionValuProp}.`);
      if (divisionObjectionHandlers && divisionObjectionHandlers.length > 0) {
        parts.push(`Known objections: ${divisionObjectionHandlers.map((o) => `"${o.objection}" → ${o.response}`).join('; ')}.`);
      }
      divisionIntelLine = parts.join(' ') + '\n';
    }

    // Channel instruction from shared config — placed at the END for recency bias
    const channelInstruction = channelConfig.buildInstruction(company.name);

    const systemPrompt = `You are a B2B sales content writer.
${aeIdentityLine}${senderRoleLine}${requestedToneLine}${intentLine}${matrixLine}${actionLine}${userContextLine}${toneLine}${landminesLine}${divisionIntelLine}
The user is creating ${channelConfig.label} content for the target account "${company.name}".
${departmentContext}${recipientsSection}

Context below includes:
1) TARGET ACCOUNT: research and account messaging for ${company.name}.
2) YOUR COMPANY: messaging framework, product knowledge, industry playbook, case studies, upcoming events, and feature releases.
3) CONTENT LIBRARY: relevant snippets for this use case.
${existingStackLine}${activeObjectionsSection}
${ragSection}
${productSection}
${playbookSection}
${caseStudiesSection}
${eventsSection}
${featureReleasesSection}
${messagingSection}${accountSection}${researchSection}
${channelInstruction}`;

    const { text } = await generateText({
      model: getChatModel('full', channelConfig.modelHint),
      maxOutputTokens: channelConfig.maxOutputTokens,
      system: systemPrompt,
      prompt: channelConfig.buildUserPrompt(),
    });

    const raw = text.trim();
    const parsed = channelConfig.parseOutput(raw);

    return NextResponse.json({
      contentId: crypto.randomUUID(),
      ...parsed,
    });
  } catch (error) {
    console.error('POST /api/content/generate error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
