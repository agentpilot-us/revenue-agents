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
    const body = await req.json();
    const contentType = body.contentType as 'email' | 'linkedin' | 'talk_track';
    const departmentId = body.departmentId as string | undefined;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true, name: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get department context if provided
    let departmentContext = '';
    if (departmentId) {
      const department = await prisma.companyDepartment.findFirst({
        where: { id: departmentId, companyId },
        select: {
          valueProp: true,
          useCase: true,
          targetRoles: true,
          customName: true,
          type: true,
        },
      });
      if (department) {
        const deptName = department.customName || department.type.replace(/_/g, ' ');
        departmentContext = `\n\nBUYING GROUP CONTEXT:
- Name: ${deptName}
- Value Proposition: ${department.valueProp || 'Not specified'}
- Use Case: ${department.useCase || 'Not specified'}
- Target Roles: ${JSON.stringify(department.targetRoles || {})}
`;
      }
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

    const contentTypeInstruction =
      contentType === 'email'
        ? 'Generate an email: include a "Subject:" line first, then a blank line, then the email body (plain text, 2-4 short paragraphs). Use the context below for the target account and your company\'s messaging and value props.'
        : contentType === 'linkedin'
          ? 'Generate a LinkedIn post or message: professional tone, concise. Use the context below for the target account and your company\'s messaging. Output plain text only.'
          : contentType === 'talk_track'
            ? 'Generate a talk track for a discovery call: provide bullet points (one per line) that cover key talking points, questions to ask, and value propositions to highlight. Use the context below for the target account and buying group.'
            : 'Generate copy for a custom URL or landing page: include a short headline, a body paragraph or two, and a CTA button label. Use the context below. Output plain text with clear line breaks (e.g. "Headline: ...", "Body: ...", "CTA: ...").';

    const systemPrompt = `You are a B2B content writer. The user is creating ${contentType.replace(/_/g, ' ')} content for the target account "${company.name}".
${departmentContext}
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
      prompt: `Generate ${contentType.replace(/_/g, ' ')} content for ${company.name}${departmentContext ? ` targeting the buying group specified above` : ''}. Output only the requested content, no preamble.`,
    });

    return NextResponse.json({ content: text.trim() });
  } catch (error) {
    console.error('Generate content API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
