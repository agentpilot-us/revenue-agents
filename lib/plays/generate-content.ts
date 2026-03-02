/**
 * generateOneContent — shared core for all content generation.
 * Used by create-content (single) and run-content (3x parallel).
 * Builds full context: research, account messaging, RAG, product,
 * playbook, case studies, messaging framework, then calls generateText.
 */

import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { getMessagingContextForAgent } from '@/lib/messaging-frameworks';
import { getAccountMessagingPromptBlock } from '@/lib/account-messaging';
import { getCompanyResearchPromptBlock } from '@/lib/research/company-research-prompt';
import {
  getProductKnowledgeBlock,
  getIndustryPlaybookBlock,
  getCaseStudiesBlock,
  getRelevantProductIdsForIndustry,
} from '@/lib/prompt-context';
import {
  findRelevantContentLibraryChunks,
  formatRAGChunksForPrompt,
} from '@/lib/content-library-rag';
import { prisma } from '@/lib/db';

export type GenerateContentType = 'email' | 'linkedin' | 'custom_url' | 'talking_points' | 'presentation';

export async function generateOneContent(params: {
  companyId: string;
  userId: string;
  contentType: GenerateContentType;
  prompt: string;
}): Promise<{ content: string }> {
  const { companyId, userId, contentType, prompt } = params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true, name: true, industry: true },
  });
  if (!company) throw new Error('Company not found');

  const [researchBlock, accountBlock, messagingSection, relevantProductIds] = await Promise.all([
    getCompanyResearchPromptBlock(companyId, userId),
    getAccountMessagingPromptBlock(companyId, userId),
    getMessagingContextForAgent(userId, company.industry ?? undefined),
    getRelevantProductIdsForIndustry(userId, company.industry ?? null, null),
  ]);

  const [productKnowledgeBlock, industryPlaybookBlock, caseStudiesBlock] = await Promise.all([
    getProductKnowledgeBlock(userId, relevantProductIds.length > 0 ? relevantProductIds : undefined),
    getIndustryPlaybookBlock(userId, company.industry ?? null),
    getCaseStudiesBlock(userId, company.industry ?? null, null, relevantProductIds),
  ]);

  const ragQuery = `value proposition for ${company.name} ${company.industry ?? ''} for ${contentType}`;
  const ragChunks = await findRelevantContentLibraryChunks(userId, ragQuery, 8);

  const researchSection = researchBlock ? `\n\n${researchBlock}` : '';
  const accountSection = accountBlock ? `\n\n${accountBlock}` : '';
  const productSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
  const playbookSection = industryPlaybookBlock ? `\n\n${industryPlaybookBlock}` : '';
  const caseStudiesSection = caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';
  const ragSection = ragChunks.length > 0 ? `\n\n${formatRAGChunksForPrompt(ragChunks)}` : '';

  const contentTypeInstruction = getContentTypeInstruction(contentType, company.name);

  const systemPrompt = `You are a B2B content writer. The user is creating ${contentType.replace(/_/g, ' ')} content for the target account "${company.name}".

${contentTypeInstruction}

Context below includes:
1) TARGET ACCOUNT: research and account messaging for ${company.name}.
2) YOUR COMPANY: messaging framework, product knowledge, industry playbook, and case studies. Use these for value props and tone.
${ragSection}
${productSection}
${playbookSection}
${caseStudiesSection}
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
- 2-3 objections this buyer is likely to raise, with a one-sentence response to each

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
