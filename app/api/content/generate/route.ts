import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

const GenerateSchema = z.object({
  companyId: z.string(),
  divisionId: z.string().optional(),
  channel: z.enum(['email', 'linkedin_inmail']),
  persona: z.enum(['csuite', 'vp', 'director', 'all']).optional(),
  contactIds: z.array(z.string()).optional(),
  triggerId: z.string().optional(),
  activeActionIndex: z.number().int().min(0).optional(),
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

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true, name: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Buying group / division context (maps to CompanyDepartment)
    let departmentContext = '';
    if (divisionId) {
      const department = await prisma.companyDepartment.findFirst({
        where: { id: divisionId, companyId },
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

    // Recipient context (optional)
    let recipientsSection = '';
    if (input.contactIds && input.contactIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: { companyId, id: { in: input.contactIds } },
        select: { firstName: true, lastName: true, title: true },
      });
      if (contacts.length > 0) {
        const lines = contacts.map((c, idx) => {
          const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Contact';
          return `- Recipient ${idx + 1}: ${name}${
            c.title ? ` (${c.title})` : ''
          }`;
        });
        recipientsSection = `\n\nRECIPIENTS:\n${lines.join('\n')}`;
      }
    }

    const personaLabelMap: Record<string, string> = {
      csuite: 'C-Suite',
      vp: 'VP and above',
      director: 'Director and above',
      all: 'All levels in buying group',
    };
    const personaLine = input.persona
      ? `Target seniority: ${personaLabelMap[input.persona]}.\n`
      : '';

    const [researchBlock, accountBlock, messagingSection, relevantProductIds] =
      await Promise.all([
        getCompanyResearchPromptBlock(companyId, session.user.id),
        getAccountMessagingPromptBlock(companyId, session.user.id),
        getMessagingContextForAgent(session.user.id, company.industry ?? undefined),
        getRelevantProductIdsForIndustry(
          session.user.id,
          company.industry ?? null,
          null
        ),
      ]);

    const [productKnowledgeBlock, industryPlaybookBlock, caseStudiesBlock] =
      await Promise.all([
        getProductKnowledgeBlock(
          session.user.id,
          relevantProductIds.length > 0 ? relevantProductIds : undefined
        ),
        getIndustryPlaybookBlock(session.user.id, company.industry ?? null),
        getCaseStudiesBlock(
          session.user.id,
          company.industry ?? null,
          null,
          relevantProductIds
        ),
      ]);

    const researchSection = researchBlock ? `\n\n${researchBlock}` : '';
    const accountSection = accountBlock ? `\n\n${accountBlock}` : '';
    const productSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
    const playbookSection = industryPlaybookBlock
      ? `\n\n${industryPlaybookBlock}`
      : '';
    const caseStudiesSection = caseStudiesBlock ? `\n\n${caseStudiesBlock}` : '';

    const ragQuery = `value proposition for ${company.name} ${
      company.industry ?? ''
    } for ${channel}`;
    const ragChunks = await findRelevantContentLibraryChunks(
      session.user.id,
      ragQuery,
      8
    );
    const ragSection =
      ragChunks.length > 0
        ? `\n\n${formatRAGChunksForPrompt(ragChunks)}`
        : '';

    let contentInstruction: string;
    if (channel === 'email') {
      contentInstruction =
        'Generate an email: include a "Subject:" line first, then a blank line, then the email body (plain text, 2-4 short paragraphs). Use the context below for the target account and your company\'s messaging and value props.';
    } else {
      // linkedin_inmail
      contentInstruction =
        'Generate a LinkedIn InMail. First write a one-sentence hook not longer than 300 characters, prefixed with "HOOK:". Then a blank line, then the full InMail body prefixed with "BODY:". Use the context below for the target account and your company messaging. Output plain text only.';
    }

    const systemPrompt = `You are a B2B sales content writer. The user is creating ${
      channel === 'email' ? 'an email' : 'a LinkedIn InMail'
    } for the target account "${company.name}".
${personaLine}${departmentContext}${recipientsSection}

${contentInstruction}

Context below includes:
1) TARGET ACCOUNT: research and account messaging for ${company.name}.
2) YOUR COMPANY: messaging framework, product knowledge, industry playbook, and case studies.
3) CONTENT LIBRARY: relevant snippets for this use case.
${ragSection}
${productSection}
${playbookSection}
${caseStudiesSection}
${messagingSection}${accountSection}${researchSection}`;

    const { text } = await generateText({
      model: getChatModel(),
      maxOutputTokens: 1500,
      system: systemPrompt,
      prompt:
        channel === 'email'
          ? `Generate the email as specified. Output only the email text.`
          : `Generate the InMail as specified. Output only the HOOK and BODY sections.`,
    });

    const raw = text.trim();

    if (channel === 'email') {
      const lines = raw.split('\n');
      let subject = '';
      let bodyStart = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().startsWith('subject:')) {
          subject = lines[i].replace(/^subject:\s*/i, '').trim();
          bodyStart = i + 1;
          if (lines[bodyStart]?.trim() === '') bodyStart++;
          break;
        }
      }
      const body = lines.slice(bodyStart).join('\n').trim();
      return NextResponse.json({
        contentId: crypto.randomUUID(),
        subject,
        body,
      });
    }

    // linkedin_inmail
    let hook = '';
    let body = raw;
    const hookMatch = raw.match(/HOOK:\s*(.+)/i);
    if (hookMatch) {
      hook = hookMatch[1].trim();
      const bodyIndex = raw.toLowerCase().indexOf('body:');
      if (bodyIndex >= 0) {
        body = raw.slice(bodyIndex + 'body:'.length).trim();
      }
    }

    return NextResponse.json({
      contentId: crypto.randomUUID(),
      hook,
      body,
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

