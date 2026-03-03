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
  getCompanyEventsBlock,
  getFeatureReleasesBlock,
} from '@/lib/prompt-context';
import {
  findRelevantContentLibraryChunks,
  formatRAGChunksForPrompt,
} from '@/lib/content-library-rag';

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
  ]),
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

    // Buying group / division context (maps to CompanyDepartment)
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
          null,
          relevantProductIds
        ),
        getCompanyEventsBlock(session.user.id, company.industry ?? null, departmentLabel, null),
        getFeatureReleasesBlock(session.user.id, company.industry ?? null, 10),
        company.industry
          ? prisma.industryPlaybook.findFirst({
              where: { userId: session.user.id },
              select: { landmines: true },
            })
          : Promise.resolve(null),
      ]);

    // Phase 4: Channel-based context tiering
    const isShortForm = ['sms', 'slack'].includes(channel);
    const isMediumForm = ['linkedin_post'].includes(channel);

    const researchSection = researchBlock && !isShortForm ? `\n\n${researchBlock}` : '';
    const accountSection = accountBlock && !isShortForm ? `\n\n${accountBlock}` : '';
    const productSection = productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : '';
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

    // Phase 4: Targeted RAG query — use division + product when available
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

    // AE identity line
    const aeIdentityLine = aeCompany
      ? `You are writing on behalf of ${aeName} at ${aeCompany}.\n`
      : `You are writing on behalf of ${aeName}.\n`;

    // Active action context (from trigger-based CTA)
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

    // Explicit landmines (Do NOT)
    const landminesArr = Array.isArray(playbook?.landmines) ? (playbook.landmines as string[]) : [];
    const defaultLandmines = ['use generic openers like "I hope this email finds you well"', 'lead with your product name before establishing relevance'];
    const allLandmines = landminesArr.length > 0 ? landminesArr : defaultLandmines;
    const landminesLine = `Do NOT: ${allLandmines.join('; ')}.\n`;

    // Division-specific context for talking points
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

    let contentInstruction: string;
    if (channel === 'email') {
      contentInstruction =
        'Generate an email: include a "Subject:" line first, then a blank line, then the email body (plain text, 2-4 short paragraphs). Use the context below for the target account and your company\'s messaging and value props.';
    } else if (channel === 'linkedin_inmail') {
      contentInstruction =
        'Generate a LinkedIn InMail. First write a one-sentence hook not longer than 300 characters, prefixed with "HOOK:". Then a blank line, then the full InMail body prefixed with "BODY:". Use the context below for the target account and your company messaging. Output plain text only.';
    } else if (channel === 'linkedin_post') {
      contentInstruction =
        'Generate a LinkedIn post: 1–3 short paragraphs, conversational and value-driven. Do NOT include any labels or markdown; output plain text only.';
    } else if (channel === 'slack') {
      contentInstruction =
        'Generate a short Slack DM: 2–4 sentences, friendly but professional. Output plain text only.';
    } else if (channel === 'sms') {
      contentInstruction =
        'Generate a brief SMS/text message: maximum 2–3 sentences, concise and clear. Output plain text only.';
    } else if (channel === 'presentation') {
      contentInstruction = `Generate a 3-5 slide presentation outline for a sales meeting with ${company.name}. Structure each slide as:

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
    } else {
      // sales_page
      contentInstruction =
        'Generate a short outline for a division-specific sales page: include a headline, 3–5 bullet points of value props, and one suggested CTA label. Output as plain text with clear line breaks.';
    }

    const systemPrompt = `You are a B2B sales content writer.
${aeIdentityLine}${actionLine}${personaLine}${landminesLine}${divisionIntelLine}
The user is creating ${channel.replace('_', ' ')} for the target account "${company.name}".
${departmentContext}${recipientsSection}

${contentInstruction}

Context below includes:
1) TARGET ACCOUNT: research and account messaging for ${company.name}.
2) YOUR COMPANY: messaging framework, product knowledge, industry playbook, case studies, upcoming events, and feature releases.
3) CONTENT LIBRARY: relevant snippets for this use case.
${ragSection}
${productSection}
${playbookSection}
${caseStudiesSection}
${eventsSection}
${featureReleasesSection}
${messagingSection}${accountSection}${researchSection}`;

    // Phase 4: Per-channel maxOutputTokens
    const maxOutputTokensByChannel: Record<string, number> = {
      sms: 100,
      slack: 200,
      linkedin_post: 400,
      linkedin_inmail: 800,
      email: 1000,
      talking_points: 1500,
      presentation: 2500,
      sales_page: 1500,
    };
    const maxOutputTokens = maxOutputTokensByChannel[channel] ?? 1500;

    const { text } = await generateText({
      model: getChatModel(),
      maxOutputTokens,
      system: systemPrompt,
      prompt:
        channel === 'email'
          ? `Generate the email as specified. Output only the email text.`
          : channel === 'linkedin_inmail'
            ? `Generate the InMail as specified. Output only the HOOK and BODY sections.`
            : channel === 'presentation'
              ? `Generate the presentation outline as specified. Output only the SLIDE/BULLETS/SPEAKER NOTES blocks.`
              : `Generate the content as specified. Output only the raw text content.`,
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

    if (channel === 'linkedin_inmail') {
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
    }

    if (channel === 'presentation') {
      const slides: Array<{ slideNumber: number; title: string; bullets: string[]; speakerNotes: string }> = [];
      const slideBlocks = raw.split(/\n(?=SLIDE\s*\d+\s*:)/im);
      for (const block of slideBlocks) {
        const numMatch = block.match(/^SLIDE\s*(\d+)\s*:\s*(.+?)(?=\n|$)/im);
        if (!numMatch) continue;
        const slideNumber = parseInt(numMatch[1], 10);
        const title = numMatch[2].trim();
        let bullets: string[] = [];
        let speakerNotes = '';
        const bulletsMatch = block.match(/BULLETS?\s*:\s*([\s\S]*?)(?=SPEAKER\s+NOTES\s*:|$)/im);
        if (bulletsMatch) {
          bullets = bulletsMatch[1]
            .split(/\n/)
            .map((l) => l.replace(/^[\s\-*]*/, '').trim())
            .filter(Boolean);
        }
        const notesMatch = block.match(/SPEAKER\s+NOTES\s*:\s*([\s\S]*?)$/im);
        if (notesMatch) {
          speakerNotes = notesMatch[1].trim();
        }
        slides.push({ slideNumber, title, bullets, speakerNotes });
      }
      if (slides.length === 0) {
        slides.push({
          slideNumber: 1,
          title: 'Presentation',
          bullets: [raw],
          speakerNotes: '',
        });
      }
      return NextResponse.json({
        contentId: crypto.randomUUID(),
        slides,
      });
    }

    // Other channels: body-only content
    return NextResponse.json({
      contentId: crypto.randomUUID(),
      body: raw,
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

