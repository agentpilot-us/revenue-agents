import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
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

// RESTORED: talking_points added back
const contentTypeSchema = ['email', 'linkedin', 'custom_url', 'talking_points'] as const;
type ContentType = (typeof contentTypeSchema)[number];

function isContentType(s: string): s is ContentType {
  return contentTypeSchema.includes(s as ContentType);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true, name: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let body: { contentType?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const rawContentType = body.contentType ?? '';
    const contentType: ContentType = isContentType(rawContentType) ? rawContentType : 'email';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const [researchBlock, accountBlock, messagingSection, relevantProductIds] = await Promise.all([
      getCompanyResearchPromptBlock(companyId, session.user.id),
      getAccountMessagingPromptBlock(companyId, session.user.id),
      getMessagingContextForAgent(session.user.id, company.industry ?? undefined),
      getRelevantProductIdsForIndustry(session.user.id, company.industry ?? null, null),
    ]);

    const [productKnowledgeBlock, industryPlaybookBlock, caseStudiesBlock] = await Promise.all([
      getProductKnowledgeBlock(
        session.user.id,
        relevantProductIds.length > 0 ? relevantProductIds : undefined
      ),
      getIndustryPlaybookBlock(session.user.id, company.industry ?? null),
      getCaseStudiesBlock(session.user.id, company.industry ?? null, null, relevantProductIds),
    ]);

    const researchSection = researchBlock ? `\n\n${researchBlock}` : '';
    const accountSection = accountBlock ? `\n\n${accountBlock}` : '';
    const productSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
    const playbookSection = industryPlaybookBlock ? `\n\n${industryPlaybookBlock}` : '';
    const caseStudiesSection = caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';

    const ragQuery = `value proposition for ${company.name} ${company.industry ?? ''} for ${contentType}`;
    const ragChunks = await findRelevantContentLibraryChunks(session.user.id, ragQuery, 8);
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

    return NextResponse.json({ content: text.trim() });
  } catch (error: unknown) {
    console.error('Create content API error:', error);

    const isQuotaError =
      (error as { statusCode?: number })?.statusCode === 429 ||
      (error as { data?: { error?: { code?: string } } })?.data?.error?.code ===
        'insufficient_quota' ||
      (error instanceof Error && /quota|rate limit|429/i.test(error.message));

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: 'Embedding quota exceeded',
          details:
            'Your OpenAI (or embedding provider) quota or billing limit was exceeded. Check your plan and billing at https://platform.openai.com/account/billing.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getContentTypeInstruction(contentType: ContentType, companyName: string): string {
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
- Conversation starters tied to what's happening at the account right now (use any signal context in the prompt)

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
  }
}
