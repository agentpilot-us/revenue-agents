import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateObject } from 'ai';
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
import { buildExistingStackBlock, resolveProductFraming } from '@/lib/products/resolve-product-framing';

const stepContentSchema = z.object({
  steps: z.array(
    z.object({
      stepId: z.string(),
      subject: z.string().optional().describe('Email subject line (only for email steps)'),
      body: z.string().describe('The generated content body'),
    }),
  ),
});

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: workflowId } = await params;

    const workflow = await prisma.actionWorkflow.findFirst({
      where: { id: workflowId, userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            dealObjective: true,
            dealContext: true,
          },
        },
        targetContact: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        targetDivision: {
          select: { id: true, customName: true, type: true },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, title: true, email: true },
            },
            division: {
              select: { id: true, customName: true, type: true, valueProp: true, useCase: true },
            },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const contentSteps = workflow.steps.filter(
      (s) =>
        s.stepType === 'generate_content' &&
        s.contentType !== 'sales_page' &&
        s.status !== 'sent',
    );

    if (contentSteps.length === 0) {
      return NextResponse.json({ error: 'No content steps to generate' }, { status: 400 });
    }

    await prisma.actionWorkflowStep.updateMany({
      where: { id: { in: contentSteps.map((s) => s.id) } },
      data: { status: 'generating' },
    });

    const company = workflow.company;
    const divisionId = workflow.targetDivision?.id;

    const [userRecord] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, companyName: true },
      }),
    ]);

    const aeName = userRecord?.name || 'the sales rep';
    const aeCompany = userRecord?.companyName || '';

    let divisionIntelLine = '';
    let departmentLabel: string | null = null;
    if (divisionId) {
      const dept = await prisma.companyDepartment.findFirst({
        where: { id: divisionId, companyId: company.id },
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
      getCompanyResearchPromptBlock(company.id, userId),
      getAccountMessagingPromptBlock(company.id, userId),
      getActiveObjectionsBlock(company.id, userId, divisionId),
      getMessagingContextForAgent(userId, company.industry ?? undefined),
      getRelevantProductIdsForIndustry(userId, company.industry ?? null, null),
      getActiveObjectionTexts(company.id, userId),
      getExistingProductNames(company.id, userId),
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

    const ragQuery = [company.name, company.industry ?? '', departmentLabel ?? '', 'value proposition'].filter(Boolean).join(' ');
    const ragChunks = await findRelevantContentLibraryChunks(userId, ragQuery, 6);

    const existingStackBlock = await buildExistingStackBlock(company.id, userId);

    // Deal context
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

    // Product framing
    let productFramingLine = '';
    if (relevantProductIds[0]) {
      try {
        const framing = await resolveProductFraming(company.id, relevantProductIds[0]);
        productFramingLine = `\nPRODUCT FRAMING (${framing.framing}): ${framing.context}\n`;
      } catch { /* non-critical */ }
    }

    // Signal context
    const signalCtx = workflow.signalContext as Record<string, unknown> | null;
    let signalLine = '';
    if (signalCtx) {
      signalLine = `\nTriggering signal: ${signalCtx.title || ''} — ${signalCtx.summary || ''}`;
    }

    // Contact context — aggregate unique contacts from steps, fall back to workflow-level target
    const stepContacts = contentSteps
      .filter((s) => s.contact)
      .map((s) => s.contact!);
    const uniqueContacts = new Map(stepContacts.map((c) => [c.id, c]));
    let contactLine = '';
    if (uniqueContacts.size > 0) {
      const contactDescs = [...uniqueContacts.values()].map(
        (c) => `  - ${c.firstName} ${c.lastName}, ${c.title || 'Unknown Title'}${c.email ? ` (${c.email})` : ''}`,
      );
      contactLine = `\nTarget contact${uniqueContacts.size > 1 ? 's' : ''}:\n${contactDescs.join('\n')}`;
    } else if (workflow.targetContact) {
      contactLine = `\nTarget contact: ${workflow.targetContact.firstName} ${workflow.targetContact.lastName}, ${workflow.targetContact.title || 'Unknown Title'}`;
    }

    // Event context
    const accountCtx = workflow.accountContext as Record<string, unknown> | null;
    const eventCtx = accountCtx?.event as Record<string, unknown> | null;
    let eventLine = '';
    if (eventCtx) {
      const parts = [`Event: ${eventCtx.eventTitle || ''}`];
      if (eventCtx.eventDate || eventCtx.date) parts.push(`Date: ${eventCtx.eventDate || eventCtx.date}`);
      if (eventCtx.location) parts.push(`Location: ${eventCtx.location}`);
      if (eventCtx.description) parts.push(`Description: ${eventCtx.description}`);
      eventLine = '\n' + parts.join('\n');
    }

    const aeIdentityLine = aeCompany
      ? `You are writing on behalf of ${aeName} at ${aeCompany}.\n`
      : `You are writing on behalf of ${aeName}.\n`;

    const stepsDescription = contentSteps.map((s) => {
      const typeLabel = s.contentType === 'email' ? 'email (Subject + Body)'
        : s.contentType === 'linkedin_inmail' ? 'LinkedIn InMail (under 200 words)'
        : s.contentType === 'talking_points' ? 'talking points (OPENING, KEY PAIN, VALUE PROPS, OBJECTIONS, PROOF POINT, NEXT STEP)'
        : s.contentType?.replace(/_/g, ' ') || 'content';
      const contactTag = s.contact
        ? ` [TO: ${s.contact.firstName} ${s.contact.lastName}, ${s.contact.title || ''}]`
        : '';
      return `- Step ${s.stepOrder} (stepId: "${s.id}"): ${typeLabel}${contactTag} — ${s.promptHint || 'Generate content for this step'}`;
    }).join('\n');

    const systemPrompt = `You are a B2B sales content writer creating a coherent multi-channel outreach sequence.
${aeIdentityLine}${divisionIntelLine}
Generate content for ALL of the following steps for the target account "${company.name}".
Each step's content should build on the previous — maintain consistent messaging, tone, and narrative across channels.
${signalLine}${eventLine}${contactLine}

STEPS TO GENERATE:
${stepsDescription}

IMPORTANT:
- All steps are part of a single play/campaign. Use consistent hooks, value props, and call-to-actions.
- For email steps: include a subject line and body (2-4 paragraphs).
- For LinkedIn steps: professional but conversational, under 200 words.
- For talking_points steps: structured with OPENING, KEY PAIN, VALUE PROPS, OBJECTIONS, PROOF POINT, NEXT STEP.
- Reference the same signal/event/context across all steps so the prospect gets a coherent experience.
- When a step has a [TO: ...] tag, personalize the content to that contact's title and seniority. Tailor the language, depth, and value framing to their role.
${dealContextLine}${productFramingLine}
${existingStackBlock ? `\n${existingStackBlock}\n` : ''}${activeObjectionsBlock ? `\n\n${activeObjectionsBlock}` : ''}
${ragChunks.length > 0 ? `\n\n${formatRAGChunksForPrompt(ragChunks)}` : ''}
${productKnowledgeBlock ? `\n\n${productKnowledgeBlock}` : ''}
${industryPlaybookBlock ? `\n\n${industryPlaybookBlock}` : ''}
${caseStudiesBlock ? `\n\n${caseStudiesBlock}` : ''}
${eventsBlock ? `\n\n${eventsBlock}` : ''}
${featureReleasesBlock ? `\n\n${featureReleasesBlock}` : ''}
${messagingSection}${accountBlock ? `\n\n${accountBlock}` : ''}${researchBlock ? `\n\n${researchBlock}` : ''}`;

    const { object } = await generateObject({
      model: getChatModel(),
      schema: stepContentSchema,
      maxOutputTokens: 4000,
      system: systemPrompt,
      prompt: `Action: ${workflow.title}\n\nGenerate content for all ${contentSteps.length} steps listed above. Return each with its stepId. Be specific to this account.`,
    });

    const resultMap = new Map(object.steps.map((s) => [s.stepId, s]));

    for (const step of contentSteps) {
      const generated = resultMap.get(step.id);
      if (generated) {
        const generatedContent: Record<string, string> = { body: generated.body, raw: generated.body };
        if (generated.subject) {
          generatedContent.subject = generated.subject;
          generatedContent.raw = `Subject: ${generated.subject}\n\n${generated.body}`;
        }
        await prisma.actionWorkflowStep.update({
          where: { id: step.id },
          data: { status: 'ready', generatedContent },
        });
      } else {
        await prisma.actionWorkflowStep.update({
          where: { id: step.id },
          data: { status: 'failed', failureReason: 'Content not returned by LLM' },
        });
      }
    }

    return NextResponse.json({ success: true, generatedCount: resultMap.size });
  } catch (error) {
    console.error('POST /api/action-workflows/[id]/generate-all error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
