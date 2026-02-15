import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getMessagingContextForAgent } from '@/lib/messaging-frameworks';
import { getAccountMessagingPromptBlock } from '@/lib/account-messaging';
import { getCompanyResearchPromptBlock } from '@/lib/research/company-research-prompt';
import {
  getProductKnowledgeBlock,
  getIndustryPlaybookBlock,
  getCaseStudiesBlock,
  getRelevantProductIdsForIndustry,
} from '@/lib/prompt-context';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, contactId, departmentId } = await req.json();
    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    const company = await prisma.company.findFirst({
      where: { id: accountId, userId: session.user.id },
      select: { id: true, name: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    let contact: { id: string; firstName: string | null; lastName: string | null; title: string | null; department: string | null } | null = null;
    if (contactId) {
      contact = await prisma.contact.findFirst({
        where: { id: contactId, companyId: accountId },
        select: { id: true, firstName: true, lastName: true, title: true, department: true },
      });
    }

    let departmentName: string | null = null;
    if (departmentId) {
      const dept = await prisma.companyDepartment.findFirst({
        where: { id: departmentId, companyId: accountId },
        select: { customName: true, type: true },
      });
      departmentName = dept ? (dept.customName ?? dept.type.replace(/_/g, ' ')) : null;
    }

    const orConditions: Array<{ industry?: string | null; department?: string }> = [];
    if (company.industry) {
      orConditions.push({ industry: company.industry }, { industry: null }, { industry: '' });
    }
    if (contact?.department) {
      orConditions.push({ department: contact.department });
    }
    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
      userConfirmed: true,
      isActive: true,
    };
    if (company.name) {
      whereClause.AND = [
        ...(orConditions.length > 0 ? [{ OR: orConditions }] : []),
        { OR: [{ company: company.name }, { company: null }, { company: '' }] },
      ];
    } else if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    const relevantContent = await prisma.contentLibrary.findMany({
      where: whereClause,
      orderBy: [{ company: 'desc' }, { department: 'desc' }, { industry: 'desc' }],
      take: 8,
      select: { id: true, title: true, type: true, department: true },
    });

    const messagingSection = await getMessagingContextForAgent(session.user.id, company.industry ?? undefined);

    const accountContextBlock = await getAccountMessagingPromptBlock(accountId, session.user.id);

    const contactDepartment = contact?.department ?? departmentName ?? null;
    const relevantProductIds = await getRelevantProductIdsForIndustry(
      session.user.id,
      company.industry ?? null,
      contactDepartment
    );
    const productKnowledgeBlock = await getProductKnowledgeBlock(
      session.user.id,
      relevantProductIds.length > 0 ? relevantProductIds : undefined
    );
    const industryPlaybookBlock = await getIndustryPlaybookBlock(
      session.user.id,
      company.industry ?? null
    );
    const caseStudiesBlock = await getCaseStudiesBlock(
      session.user.id,
      company.industry ?? null,
      contactDepartment,
      relevantProductIds
    );

    const contactName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'there'
      : 'there';
    const contextParts = [
      `Account: ${company.name}`,
      company.industry ? `Industry: ${company.industry}` : '',
      departmentName ? `Department: ${departmentName}` : '',
      contact ? `Contact: ${contactName}${contact.title ? ` (${contact.title})` : ''}` : 'No specific contact',
      'Generate a short, relevant follow-up or intro email. Use the messaging guidelines and content library context below.',
    ].filter(Boolean);

    const contentSummary = relevantContent.length > 0
      ? relevantContent.map((c) => `- ${c.title} (${c.type}${c.department ? `, ${c.department}` : ''})`).join('\n')
      : 'No content library matches.';

    const accountBlockSection = accountContextBlock
      ? `\n\n${accountContextBlock}\n`
      : '';
    const researchDataBlock = await getCompanyResearchPromptBlock(accountId, session.user.id);
    const researchSection = researchDataBlock ? `\n\n${researchDataBlock}` : '';
    const productKnowledgeSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
    const industryPlaybookSection = industryPlaybookBlock ? `\n\n${industryPlaybookBlock}` : '';
    const caseStudiesSection = caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 800,
      system: `You draft a single follow-up or intro email for a B2B sales context. Be concise (2-4 short paragraphs). Use the messaging framework and reference value props/case studies where relevant. Return ONLY a JSON object with "subject" (string) and "body" (string, plain text). No HTML.
${productKnowledgeSection}
${industryPlaybookSection}
${caseStudiesSection}
${messagingSection}${accountBlockSection}${researchSection}`,
      prompt: `Context:
${contextParts.join('\n')}

Content Library items (use for value props / case studies):
${contentSummary}

Draft one email. Return JSON: { "subject": "...", "body": "..." }`,
    });

    let subject = 'Following up';
    let body = '';
    try {
      const parsed = JSON.parse(text.trim().replace(/^```json?\n?|\n?```$/g, ''));
      if (parsed.subject) subject = parsed.subject;
      if (parsed.body) body = parsed.body;
    } catch {
      body = text;
    }

    return NextResponse.json({
      success: true,
      draft: { subject, body },
      context: {
        accountName: company.name,
        contactName: contact ? contactName : null,
        departmentName,
      },
      contentLibraryMatches: relevantContent.map((c) => ({ id: c.id, title: c.title, type: c.type })),
    });
  } catch (error) {
    console.error('Draft follow-up error:', error);
    return NextResponse.json(
      { error: 'Draft failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
