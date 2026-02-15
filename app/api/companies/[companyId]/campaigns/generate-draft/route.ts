import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import {
  getCompanyEventsBlock,
  getCaseStudiesBlock,
} from '@/lib/prompt-context';
import { getAccountMessagingPromptBlock } from '@/lib/account-messaging';
import { getCompanyResearchPromptBlock } from '@/lib/research/company-research-prompt';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const bodySchema = z.object({
  scope: z.enum(['company', 'segments']),
  departmentIds: z.array(z.string()).max(5).optional().default([]),
  options: z.object({
    includeFutureEvents: z.boolean().default(false),
    addCaseStudy: z.boolean().default(false),
    showSuccessStory: z.boolean().default(false),
  }).default({}),
});

const pageSectionEventSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
});
const pageSectionRefSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  link: z.string().optional(),
});
const pageSectionsSchema = z.object({
  events: z.array(pageSectionEventSchema).optional(),
  caseStudy: pageSectionRefSchema.optional(),
  successStory: pageSectionRefSchema.optional(),
}).optional();

const draftSchema = z.object({
  departmentId: z.string().nullable(),
  segmentName: z.string(),
  headline: z.string(),
  body: z.string(),
  pageSections: pageSectionsSchema.optional(),
});

const outputSchema = z.object({
  drafts: z.array(draftSchema),
});

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { scope, departmentIds, options } = parsed.data;

    type Target = { departmentId: string | null; segmentName: string; departmentLabel: string | null };
    let targets: Target[] = [];

    if (scope === 'company') {
      targets = [{ departmentId: null, segmentName: company.name, departmentLabel: null }];
    } else {
      if (!departmentIds.length) {
        return NextResponse.json(
          { error: 'departmentIds required when scope is segments (max 5)' },
          { status: 400 }
        );
      }
      const depts = await prisma.companyDepartment.findMany({
        where: { companyId, id: { in: departmentIds } },
        select: { id: true, customName: true, type: true },
      });
      if (depts.length === 0) {
        return NextResponse.json(
          { error: 'No valid departments found for the given departmentIds' },
          { status: 400 }
        );
      }
      targets = depts.map((d) => ({
        departmentId: d.id,
        segmentName: d.customName || d.type.replace(/_/g, ' '),
        departmentLabel: d.customName || d.type.replace(/_/g, ' '),
      }));
    }

    const [researchBlock, accountBlock] = await Promise.all([
      getCompanyResearchPromptBlock(companyId, session.user.id),
      getAccountMessagingPromptBlock(companyId, session.user.id),
    ]);

    const researchSection = researchBlock ? `\n\nTARGET ACCOUNT RESEARCH:\n${researchBlock}` : '';
    const accountSection = accountBlock ? `\n\nACCOUNT MESSAGING:\n${accountBlock}` : '';

    const contextParts: string[] = [
      `Company: ${company.name}`,
      company.industry ? `Industry: ${company.industry}` : '',
      researchSection,
      accountSection,
    ].filter(Boolean);

    const draftContexts: Array<{
      target: Target;
      eventsBlock: string | null;
      caseStudiesBlock: string | null;
    }> = [];

    for (const target of targets) {
      const [eventsBlock, caseStudiesBlock] = await Promise.all([
        options.includeFutureEvents
          ? getCompanyEventsBlock(
              session.user.id,
              company.industry ?? null,
              target.departmentLabel ?? null,
              null
            )
          : Promise.resolve(null),
        (options.addCaseStudy || options.showSuccessStory)
          ? getCaseStudiesBlock(
              session.user.id,
              company.industry ?? null,
              target.departmentLabel ?? null
            )
          : Promise.resolve(null),
      ]);
      draftContexts.push({ target, eventsBlock, caseStudiesBlock });
    }

    const targetsDescription = targets
      .map(
        (t, i) =>
          `Target ${i + 1}: segmentName="${t.segmentName}"${t.departmentId ? `, departmentId="${t.departmentId}"` : ' (company-wide)'}`
      )
      .join('\n');

    const optionsDescription = [
      options.includeFutureEvents && 'Include an "Upcoming events" section when events context is provided.',
      options.addCaseStudy && 'Include one case study (pick from case studies context).',
      options.showSuccessStory && 'Include a success story (can use case study or a short testimonial).',
    ].filter(Boolean).join(' ');

    const perTargetBlocks = draftContexts
      .map(
        (dc, i) =>
          `--- Target ${i + 1} (${dc.target.segmentName}) ---\n` +
          (dc.eventsBlock ? `EVENTS:\n${dc.eventsBlock}\n` : '') +
          (dc.caseStudiesBlock ? `CASE STUDIES:\n${dc.caseStudiesBlock}\n` : '')
      )
      .join('\n');

    const systemPrompt = `You are a B2B landing page copywriter. Generate hyper-personalized landing page drafts for the account "${company.name}".

RULES:
- Produce one draft per target. Each draft must have: departmentId (null for company-wide), segmentName, headline, body (HTML, 2-4 short paragraphs), and optionally pageSections.
- Headline: one short, benefit-focused line.
- Body: HTML with <p> tags; tone professional and specific to the segment/account.
- Options requested: ${optionsDescription || 'None'}
- When events are provided, set pageSections.events to an array of objects with title, date, description, url (from the EVENTS block for that target).
- When case study/success story is requested, set pageSections.caseStudy and/or pageSections.successStory with title, summary, link from the CASE STUDIES block.
- Use the research and account messaging below to make copy relevant to this account.`;

    const userPrompt = `TARGETS:
${targetsDescription}

PER-TARGET CONTEXT (events and case studies):
${perTargetBlocks}

${contextParts.join('\n')}

Output exactly one draft per target (${targets.length} total). Return valid JSON: { "drafts": [ { "departmentId": null or "id", "segmentName": "...", "headline": "...", "body": "<p>...</p>", "pageSections": { ... } or omit } ] }`;

    const { output } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 8000,
      system: systemPrompt,
      prompt: userPrompt,
      output: Output.object({
        schema: outputSchema,
        name: 'CampaignDrafts',
        description: 'Landing page drafts per segment or company',
      }),
    });

    const drafts = Array.isArray(output.drafts) ? output.drafts : [];
    if (drafts.length !== targets.length) {
      return NextResponse.json(
        { error: 'AI did not return the expected number of drafts', received: drafts.length, expected: targets.length },
        { status: 500 }
      );
    }

    return NextResponse.json({
      companyId,
      companyName: company.name,
      drafts: drafts.map((d, i) => ({
        departmentId: d.departmentId ?? null,
        segmentName: d.segmentName || targets[i].segmentName,
        headline: d.headline || '',
        body: d.body || '',
        pageSections: d.pageSections ?? null,
      })),
    });
  } catch (e) {
    console.error('POST campaigns/generate-draft', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
