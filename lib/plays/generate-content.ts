/**
 * generateOneContent — shared core for all content generation.
 * Used by create-content (single) and run-content (3x parallel).
 * Builds full context: research, account messaging, RAG, product,
 * playbook, case studies, messaging framework, then calls generateText.
 */

import { generateText, generateObject } from 'ai';
import { z } from 'zod';
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
import { prisma } from '@/lib/db';
import { buildExistingStackBlock, resolveProductFraming } from '@/lib/products/resolve-product-framing';

export type GenerateContentType = 'email' | 'linkedin' | 'custom_url' | 'talking_points' | 'presentation';

export async function generateOneContent(params: {
  companyId: string;
  userId: string;
  contentType: GenerateContentType;
  prompt: string;
  divisionId?: string;
}): Promise<{ content: string }> {
  const { companyId, userId, contentType, prompt, divisionId } = params;

  const [company, userRecord] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true, name: true, industry: true, dealObjective: true, dealContext: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, companyName: true },
    }),
  ]);
  if (!company) throw new Error('Company not found');

  const aeName = userRecord?.name || 'the sales rep';
  const aeCompany = userRecord?.companyName || '';

  // Division context for talking_points enrichment
  let divisionIntelLine = '';
  let departmentLabel: string | null = null;
  if (divisionId) {
    const dept = await prisma.companyDepartment.findFirst({
      where: { id: divisionId, companyId },
      select: { valueProp: true, useCase: true, objectionHandlers: true, customName: true, type: true },
    });
    if (dept) {
      departmentLabel = dept.customName || dept.type.replace(/_/g, ' ');
      const parts: string[] = [];
      if (dept.useCase) parts.push(`The buyer's division cares about: ${dept.useCase}.`);
      if (dept.valueProp) parts.push(`Our value prop to them: ${dept.valueProp}.`);
      const oh = dept.objectionHandlers;
      if (Array.isArray(oh) && oh.length > 0) {
        parts.push(`Known objections: ${(oh as Array<{ objection: string; response: string }>).map((o) => `"${o.objection}" → ${o.response}`).join('; ')}.`);
      }
      if (parts.length > 0) divisionIntelLine = parts.join(' ') + '\n';
    }
  }

  const [researchBlock, accountBlock, activeObjectionsBlock, messagingSection, relevantProductIds, objectionTexts, productNames] = await Promise.all([
    getCompanyResearchPromptBlock(companyId, userId),
    getAccountMessagingPromptBlock(companyId, userId),
    getActiveObjectionsBlock(companyId, userId, divisionId),
    getMessagingContextForAgent(userId, company.industry ?? undefined),
    getRelevantProductIdsForIndustry(userId, company.industry ?? null, null),
    getActiveObjectionTexts(companyId, userId),
    getExistingProductNames(companyId, userId),
  ]);

  const [productKnowledgeBlock, industryPlaybookBlock, caseStudiesBlock, eventsBlock, featureReleasesBlock] = await Promise.all([
    getProductKnowledgeBlock(userId, relevantProductIds.length > 0 ? relevantProductIds : undefined),
    getIndustryPlaybookBlock(userId, company.industry ?? null),
    getCaseStudiesBlock(userId, company.industry ?? null, null, relevantProductIds),
    getCompanyEventsBlock(userId, company.industry ?? null, departmentLabel, null, {
      activeObjections: objectionTexts,
      existingProducts: productNames,
    }),
    getFeatureReleasesBlock(userId, company.industry ?? null, 10),
  ]);

  // Targeted RAG query — use division when available
  const ragQueryParts = [company.name, company.industry ?? ''];
  if (departmentLabel) ragQueryParts.push(departmentLabel);
  ragQueryParts.push('value proposition');
  const ragQuery = ragQueryParts.filter(Boolean).join(' ');
  const ragChunkCount = departmentLabel ? 4 : 8;
  const ragChunks = await findRelevantContentLibraryChunks(userId, ragQuery, ragChunkCount);

  const researchSection = researchBlock ? `\n\n${researchBlock}` : '';
  const accountSection = accountBlock ? `\n\n${accountBlock}` : '';
  const activeObjectionsSection = activeObjectionsBlock ? `\n\n${activeObjectionsBlock}` : '';
  const productSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
  const playbookSection = industryPlaybookBlock ? `\n\n${industryPlaybookBlock}` : '';
  const caseStudiesSection = caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';
  const eventsSection = eventsBlock ? `\n\n${eventsBlock}` : '';
  const featureReleasesSection = featureReleasesBlock ? `\n\n${featureReleasesBlock}` : '';
  const ragSection = ragChunks.length > 0 ? `\n\n${formatRAGChunksForPrompt(ragChunks)}` : '';

  const existingStackSection = await buildExistingStackBlock(companyId, userId);
  const existingStackLine = existingStackSection ? `\n${existingStackSection}\n` : '';

  // Strategic account plan context
  let dealContextLine = '';
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

  // Product framing (expansion/upgrade/net_new)
  let productFramingLine = '';
  const relevantProductIdForFraming = relevantProductIds[0];
  if (relevantProductIdForFraming) {
    try {
      const framing = await resolveProductFraming(companyId, relevantProductIdForFraming);
      productFramingLine = `\nPRODUCT FRAMING (${framing.framing}): ${framing.context}\n`;
    } catch { /* non-critical */ }
  }

  const contentTypeInstruction = getContentTypeInstruction(contentType, company.name);

  const aeIdentityLine = aeCompany
    ? `You are writing on behalf of ${aeName} at ${aeCompany}.\n`
    : `You are writing on behalf of ${aeName}.\n`;

  const systemPrompt = `You are a B2B content writer.
${aeIdentityLine}${divisionIntelLine}
The user is creating ${contentType.replace(/_/g, ' ')} content for the target account "${company.name}".

${contentTypeInstruction}

Context below includes:
1) TARGET ACCOUNT: research and account messaging for ${company.name}.
2) YOUR COMPANY: messaging framework, product knowledge, industry playbook, case studies, upcoming events, and feature releases. Use these for value props and tone.
${dealContextLine}${productFramingLine}${existingStackLine}${activeObjectionsSection}
${ragSection}
${productSection}
${playbookSection}
${caseStudiesSection}
${eventsSection}
${featureReleasesSection}
${messagingSection}${accountSection}${researchSection}`;

  const { text } = await generateText({
    model: getChatModel(),
    maxOutputTokens: 1500,
    system: systemPrompt,
    prompt: `User prompt: ${prompt}\n\nGenerate the content. Output only the requested content, no preamble.`,
  });

  return { content: text.trim() };
}

export function getContentTypeInstruction(contentType: GenerateContentType, companyName: string): string {
  switch (contentType) {
    case 'email':
      return `Generate an email: include a "Subject:" line first, then a blank line, then the email body (plain text, 2-4 short paragraphs). Use the context below for the target account and your company's messaging and value props.`;

    case 'linkedin':
      return `Generate a LinkedIn message: connection request or InMail tone. Professional but not stiff. Under 300 characters for a connection request, under 200 words for an InMail. Reference something specific about ${companyName}. End with a clear but low-pressure ask (15-minute call, not "let's schedule a demo"). Output plain text only.`;

    case 'custom_url':
      return `Generate copy for a custom URL or landing page: include a short headline, a body paragraph or two, and a CTA button label. Use the context below. Output plain text with clear line breaks (e.g. "Headline: ...", "Body: ...", "CTA: ...").`;

    case 'talking_points':
      return `Generate a pre-meeting talking points sheet for a sales rep preparing to meet with someone at ${companyName}. Structure the output as follows:

OPENING (2-3 options):
- Conversation starters tied to what's happening at the account right now

KEY PAIN TO PROBE:
- The one question to ask that surfaces the problem your product solves for this specific buyer

VALUE PROPS FOR THIS MEETING (3 max):
- Specific to this buyer's role and what they care about — not generic company messaging

LIKELY OBJECTIONS:
- If the context below includes ACTIVE OBJECTIONS for this account, list those first with their counter-narrative, then add 1-2 inferred objections. Prioritize known objections over inferred ones.
- Otherwise list 2-3 objections this buyer is likely to raise, with a one-sentence response to each.

PROOF POINT TO DROP:
- One case study or customer reference most relevant to this company/industry

SUGGESTED NEXT STEP:
- How to close the meeting and advance the deal

Keep each section tight — this is a quick-reference sheet, not a script. Output plain text with the section headers above.`;

    case 'presentation':
      return `Generate a 3-5 slide presentation outline for a sales meeting with ${companyName}. Structure each slide as:

SLIDE [N]: [Title]
BULLETS:
- [bullet point]
SPEAKER NOTES: [what to say, 2-3 sentences]

Suggested structure:
Slide 1: Their world (account initiative/pain, not about us)
Slide 2: How we map to that (product fit, specific to this division)
Slide 3: Proof (case study or metric from a similar company)
Slide 4: What changes for them (outcomes, not features)
Slide 5: Suggested next step

Output plain text with the SLIDE/BULLETS/SPEAKER NOTES markers.`;
  }
}

const combinedPlaySchema = z.object({
  email: z.object({
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body text, 2-4 short paragraphs'),
  }).optional(),
  linkedin: z.object({
    body: z.string().describe('LinkedIn InMail or connection request, under 200 words'),
  }).optional(),
  talking_points: z.object({
    content: z.string().describe('Pre-meeting talking points sheet with sections: OPENING, KEY PAIN, VALUE PROPS, OBJECTIONS, PROOF POINT, NEXT STEP'),
  }).optional(),
});

/**
 * Single LLM call that produces all requested play content types at once,
 * sharing the same context (research, messaging, RAG) instead of paying
 * for it 3 separate times.
 */
export async function generateCombinedPlayContent(params: {
  companyId: string;
  userId: string;
  prompt: string;
  outputs?: Array<'email' | 'linkedin' | 'talking_points'>;
  divisionId?: string;
}): Promise<{ email: string; linkedin: string; talking_points: string }> {
  const { companyId, userId, prompt, outputs = ['email', 'linkedin', 'talking_points'], divisionId } = params;

  const [company, userRecord] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true, name: true, industry: true, dealObjective: true, dealContext: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, companyName: true },
    }),
  ]);
  if (!company) throw new Error('Company not found');

  const aeName = userRecord?.name || 'the sales rep';
  const aeCompany = userRecord?.companyName || '';

  let divisionIntelLine = '';
  let departmentLabel: string | null = null;
  if (divisionId) {
    const dept = await prisma.companyDepartment.findFirst({
      where: { id: divisionId, companyId },
      select: { valueProp: true, useCase: true, objectionHandlers: true, customName: true, type: true },
    });
    if (dept) {
      departmentLabel = dept.customName || dept.type.replace(/_/g, ' ');
      const parts: string[] = [];
      if (dept.useCase) parts.push(`The buyer's division cares about: ${dept.useCase}.`);
      if (dept.valueProp) parts.push(`Our value prop to them: ${dept.valueProp}.`);
      const oh = dept.objectionHandlers;
      if (Array.isArray(oh) && oh.length > 0) {
        parts.push(`Known objections: ${(oh as Array<{ objection: string; response: string }>).map((o) => `"${o.objection}" → ${o.response}`).join('; ')}.`);
      }
      if (parts.length > 0) divisionIntelLine = parts.join(' ') + '\n';
    }
  }

  const [researchBlock, accountBlock, activeObjectionsBlock, messagingSection, relevantProductIds2, objectionTexts2, productNames2] = await Promise.all([
    getCompanyResearchPromptBlock(companyId, userId),
    getAccountMessagingPromptBlock(companyId, userId),
    getActiveObjectionsBlock(companyId, userId, divisionId),
    getMessagingContextForAgent(userId, company.industry ?? undefined),
    getRelevantProductIdsForIndustry(userId, company.industry ?? null, null),
    getActiveObjectionTexts(companyId, userId),
    getExistingProductNames(companyId, userId),
  ]);

  const [productKnowledgeBlock, industryPlaybookBlock, caseStudiesBlock, eventsBlock, featureReleasesBlock] = await Promise.all([
    getProductKnowledgeBlock(userId, relevantProductIds2.length > 0 ? relevantProductIds2 : undefined),
    getIndustryPlaybookBlock(userId, company.industry ?? null),
    getCaseStudiesBlock(userId, company.industry ?? null, null, relevantProductIds2),
    getCompanyEventsBlock(userId, company.industry ?? null, departmentLabel, null, {
      activeObjections: objectionTexts2,
      existingProducts: productNames2,
    }),
    getFeatureReleasesBlock(userId, company.industry ?? null, 10),
  ]);

  const ragQueryParts = [company.name, company.industry ?? ''];
  if (departmentLabel) ragQueryParts.push(departmentLabel);
  ragQueryParts.push('value proposition');
  const ragQuery = ragQueryParts.filter(Boolean).join(' ');
  const ragChunkCount = departmentLabel ? 4 : 8;
  const ragChunks = await findRelevantContentLibraryChunks(userId, ragQuery, ragChunkCount);

  const researchSection = researchBlock ? `\n\n${researchBlock}` : '';
  const accountSection = accountBlock ? `\n\n${accountBlock}` : '';
  const activeObjectionsSection = activeObjectionsBlock ? `\n\n${activeObjectionsBlock}` : '';
  const productSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
  const playbookSection = industryPlaybookBlock ? `\n\n${industryPlaybookBlock}` : '';
  const caseStudiesSection = caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';
  const eventsSection = eventsBlock ? `\n\n${eventsBlock}` : '';
  const featureReleasesSection = featureReleasesBlock ? `\n\n${featureReleasesBlock}` : '';
  const ragSection = ragChunks.length > 0 ? `\n\n${formatRAGChunksForPrompt(ragChunks)}` : '';

  const existingStackSection2 = await buildExistingStackBlock(companyId, userId);
  const existingStackLine2 = existingStackSection2 ? `\n${existingStackSection2}\n` : '';

  // Strategic account plan context
  let dealContextLine2 = '';
  if (company.dealObjective) {
    dealContextLine2 += `\nDEAL OBJECTIVE: ${company.dealObjective}\n`;
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
      dealContextLine2 += `\nSTRATEGIC ACCOUNT PLAN:\n${parts.join('\n')}\n`;
    }
  }

  // Product framing
  let productFramingLine2 = '';
  const relevantProductIdForFraming2 = relevantProductIds2[0];
  if (relevantProductIdForFraming2) {
    try {
      const framing = await resolveProductFraming(companyId, relevantProductIdForFraming2);
      productFramingLine2 = `\nPRODUCT FRAMING (${framing.framing}): ${framing.context}\n`;
    } catch { /* non-critical */ }
  }

  const aeIdentityLine = aeCompany
    ? `You are writing on behalf of ${aeName} at ${aeCompany}.\n`
    : `You are writing on behalf of ${aeName}.\n`;

  const outputInstructions = outputs.map((t) => {
    switch (t) {
      case 'email': return '- EMAIL: subject line + body (2-4 short paragraphs, plain text)';
      case 'linkedin': return '- LINKEDIN: InMail or connection request (under 200 words, reference something specific about the account)';
      case 'talking_points': return '- TALKING_POINTS: Pre-meeting sheet with OPENING, KEY PAIN, VALUE PROPS, OBJECTIONS, PROOF POINT, NEXT STEP';
    }
  }).join('\n');

  const systemPrompt = `You are a B2B sales content writer.
${aeIdentityLine}${divisionIntelLine}
Generate ALL of the following for the target account "${company.name}" in a single response:
${outputInstructions}
${dealContextLine2}${productFramingLine2}${existingStackLine2}${activeObjectionsSection}
${ragSection}
${productSection}
${playbookSection}
${caseStudiesSection}
${eventsSection}
${featureReleasesSection}
${messagingSection}${accountSection}${researchSection}`;

  const { object } = await generateObject({
    model: getChatModel(),
    schema: combinedPlaySchema,
    maxOutputTokens: 3000,
    system: systemPrompt,
    prompt: `User prompt: ${prompt}\n\nGenerate all requested content types. Be specific to this account.`,
  });

  return {
    email: object.email ? `Subject: ${object.email.subject}\n\n${object.email.body}` : '',
    linkedin: object.linkedin?.body ?? '',
    talking_points: object.talking_points?.content ?? '',
  };
}
