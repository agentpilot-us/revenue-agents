/**
 * Plan Workflow Engine — deterministic step-by-step plan execution.
 *
 * Uses the AI SDK async generator pattern for streaming progress.
 * Each plan type maps to a fixed sequence of steps. Content generation
 * uses AI; the sequencing is coded (not left to an LLM).
 *
 * Architecture choice: deterministic workflows over agent loops for
 * reliability in sales-critical paths. The LLM generates content,
 * but the execution order and delivery are controlled by code.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { getOutboundProvider } from '@/lib/email';
import { generateOneContent } from '@/lib/content/generate-content';
import { generateSalesPageSections } from '@/lib/campaigns/generate-sales-page';
import type { PlanContext } from './plan-context';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanType =
  | 'expand_existing'
  | 'new_buying_group'
  | 'event_invite'
  | 're_engagement'
  | 'champion_enablement';

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export type PlanStep = {
  id: string;
  label: string;
  status: StepStatus;
  result?: string;
};

export type PlanProgress = {
  planType: PlanType;
  steps: PlanStep[];
  currentStep: number;
  totalSteps: number;
  summary?: string;
};

export type PlanResult = {
  success: boolean;
  salesPageUrl: string | null;
  emailSent: boolean;
  briefingUrl: string | null;
  summary: string;
  artifacts: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Step definitions per plan type
// ---------------------------------------------------------------------------

function getStepDefinitions(planType: PlanType): Pick<PlanStep, 'id' | 'label'>[] {
  const common = [
    { id: 'load_context', label: 'Loading account & product context' },
  ];

  switch (planType) {
    case 'expand_existing':
      return [
        ...common,
        { id: 'generate_page', label: 'Generating expansion sales page' },
        { id: 'publish_page', label: 'Publishing sales page' },
        { id: 'generate_email', label: 'Drafting intro email' },
        { id: 'send_email', label: 'Sending email to primary contact' },
        { id: 'create_briefing', label: 'Creating account briefing' },
        { id: 'log_activity', label: 'Logging activities' },
      ];
    case 'new_buying_group':
      return [
        ...common,
        { id: 'generate_page', label: 'Generating buying group sales page' },
        { id: 'publish_page', label: 'Publishing sales page' },
        { id: 'generate_email', label: 'Drafting cold intro email' },
        { id: 'send_email', label: 'Sending email to segment contacts' },
        { id: 'log_activity', label: 'Logging activities' },
      ];
    case 'event_invite':
      return [
        ...common,
        { id: 'generate_page', label: 'Generating event invite page' },
        { id: 'publish_page', label: 'Publishing event invite' },
        { id: 'generate_email', label: 'Drafting event invite email' },
        { id: 'send_email', label: 'Sending invite to contacts' },
        { id: 'log_activity', label: 'Logging activities' },
      ];
    case 're_engagement':
      return [
        ...common,
        { id: 'generate_page', label: 'Generating re-engagement page' },
        { id: 'publish_page', label: 'Publishing re-engagement page' },
        { id: 'generate_email', label: 'Drafting re-engagement email' },
        { id: 'send_email', label: 'Sending email to primary contact' },
        { id: 'create_briefing', label: 'Creating account briefing' },
        { id: 'log_activity', label: 'Logging activities' },
      ];
    case 'champion_enablement':
      return [
        ...common,
        { id: 'generate_page', label: 'Generating champion enablement page' },
        { id: 'publish_page', label: 'Publishing champion page' },
        { id: 'generate_email', label: 'Drafting champion forward email' },
        { id: 'send_email', label: 'Sending to champion' },
        { id: 'create_briefing', label: 'Creating executive briefing' },
        { id: 'log_activity', label: 'Logging activities' },
      ];
  }
}

function planTypeToPageType(planType: PlanType): string {
  switch (planType) {
    case 'expand_existing': return 'account_intro';
    case 'new_buying_group': return 'account_intro';
    case 'event_invite': return 'event_invite';
    case 're_engagement': return 'account_intro';
    case 'champion_enablement': return 'account_intro';
  }
}

// ---------------------------------------------------------------------------
// Workflow executor (async generator for streaming progress)
// ---------------------------------------------------------------------------

export async function* executePlanWorkflow(
  ctx: PlanContext,
  planType: PlanType,
  opts?: { autonomousEmail?: boolean }
): AsyncGenerator<PlanProgress, PlanResult> {
  const stepDefs = getStepDefinitions(planType);
  const steps: PlanStep[] = stepDefs.map((d) => ({
    ...d,
    status: 'pending' as StepStatus,
  }));

  const progress = (): PlanProgress => ({
    planType,
    steps: [...steps],
    currentStep: steps.findIndex((s) => s.status === 'running') + 1,
    totalSteps: steps.length,
  });

  const markStep = (id: string, status: StepStatus, result?: string) => {
    const step = steps.find((s) => s.id === id);
    if (step) {
      step.status = status;
      if (result) step.result = result;
    }
  };

  // Track artifacts
  const artifacts: Record<string, unknown> = {};
  let salesPageUrl: string | null = null;
  let emailSent = false;
  let briefingUrl: string | null = null;

  // ---- Step: load_context ----
  markStep('load_context', 'running');
  yield progress();
  // Context is already loaded (passed in). Validate it.
  if (!ctx.company) {
    markStep('load_context', 'failed', 'Company not found');
    yield progress();
    return { success: false, salesPageUrl: null, emailSent: false, briefingUrl: null, summary: 'Company not found', artifacts };
  }
  const contextSummary = [
    `Account: ${ctx.company.name}`,
    ctx.product ? `Product: ${ctx.product.name} (${ctx.productFraming?.framing ?? 'unknown'})` : 'No product specified',
    ctx.segment ? `Segment: ${ctx.segment.name} (${ctx.segment.contactCount} contacts)` : 'No segment specified',
    ctx.primaryContact ? `Primary contact: ${ctx.primaryContact.name ?? ctx.primaryContact.email}` : 'No primary contact',
  ].join(', ');
  markStep('load_context', 'completed', contextSummary);
  yield progress();

  // ---- Step: generate_page ----
  markStep('generate_page', 'running');
  yield progress();

  let pageHeadline = '';
  let pageSlug = '';
  let pagePreviewUrl = '';
  try {
    const pageType = planTypeToPageType(planType);
    const pageResult = await generateSalesPageSections({
      companyId: ctx.company.id,
      userId: ctx.userId,
      pageType: pageType as Parameters<typeof generateSalesPageSections>[0]['pageType'],
      departmentId: ctx.segment?.id,
    });

    if (!pageResult.ok) throw new Error(pageResult.error);

    const page = pageResult.data;
    pageHeadline = page.headline;

    const slugBase = `${ctx.company.id}-${planType}-${Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'plan';
    let slug = slugBase;
    let suffix = 0;
    let existing = await prisma.segmentCampaign.findUnique({
      where: { userId_slug: { userId: ctx.userId, slug } },
    });
    while (existing) {
      suffix += 1;
      slug = `${slugBase}-${suffix}`;
      existing = await prisma.segmentCampaign.findUnique({
        where: { userId_slug: { userId: ctx.userId, slug } },
      });
    }

    const baseUrlForSlug = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const url = `${baseUrlForSlug}/go/${slug}`;

    const campaign = await prisma.segmentCampaign.create({
      data: {
        userId: ctx.userId,
        companyId: ctx.company.id,
        departmentId: ctx.segment?.id,
        slug,
        title: `${planType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — ${ctx.segment?.name ?? ctx.company.name}`,
        description: null,
        type: 'landing_page',
        url,
        pageType,
        headline: page.headline,
        subheadline: page.subheadline ?? null,
        body: null,
        ctaLabel: page.ctaLabel ?? null,
        ctaUrl: page.ctaUrl ?? null,
        sections: page.sections?.length ? (page.sections as Prisma.InputJsonValue) : Prisma.JsonNull,
        isMultiDepartment: false,
      },
    });

    pageSlug = campaign.slug;
    pagePreviewUrl = `/go/${slug}`;
    artifacts.playResult = {
      campaignId: campaign.id,
      slug: pageSlug,
      previewUrl: pagePreviewUrl,
    };
    markStep('generate_page', 'completed', `Sales page generated: ${pagePreviewUrl}`);
  } catch (err) {
    markStep('generate_page', 'failed', err instanceof Error ? err.message : 'Generation failed');
    yield progress();
    return {
      success: false,
      salesPageUrl: null,
      emailSent: false,
      briefingUrl: null,
      summary: `Failed to generate sales page: ${err instanceof Error ? err.message : 'unknown error'}`,
      artifacts,
    };
  }
  yield progress();

  // ---- Step: publish_page ----
  markStep('publish_page', 'running');
  yield progress();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  salesPageUrl = `${baseUrl}${pagePreviewUrl}`;
  artifacts.salesPageUrl = salesPageUrl;
  markStep('publish_page', 'completed', `Live at ${salesPageUrl}`);
  yield progress();

  // ---- Step: generate_email ----
  markStep('generate_email', 'running');
  yield progress();

  let emailSubject = '';
  let emailBody = '';

  try {
    const emailResult = await generateOneContent({
      companyId: ctx.company.id,
      userId: ctx.userId,
      channel: 'email',
      contacts: ctx.primaryContact ? [{
        firstName: ctx.primaryContact.name?.split(' ')[0],
        lastName: ctx.primaryContact.name?.split(' ').slice(1).join(' '),
        title: ctx.primaryContact.title,
      }] : [],
      divisionId: ctx.segment?.id,
      userContext: `Write an intro email for the "${pageHeadline}" landing page at ${salesPageUrl}. Keep it under 100 words with a soft CTA.`,
    });
    const emailData = emailResult.parsed;
    emailSubject = typeof emailData.subject === 'string' ? emailData.subject : `${pageHeadline}`;
    emailBody = typeof emailData.body === 'string' ? emailData.body : emailResult.raw;
  } catch {
    emailSubject = pageHeadline;
    emailBody = `I put together something for your team — take a look when you get a chance: ${salesPageUrl}`;
  }

  // If product context is available, enhance the email
  if (ctx.product && ctx.productFraming) {
    try {
      const { text: enhancedEmail } = await generateText({
        model: getChatModel('fast'),
        prompt: `Rewrite this cold email to reference the product "${ctx.product.name}" and the account's existing relationship (${ctx.productFraming.context}).

Original subject: ${emailSubject}
Original body: ${emailBody}

${ctx.product.oneLiner ? `Product one-liner: ${ctx.product.oneLiner}` : ''}
${ctx.product.elevatorPitch ? `Elevator pitch: ${ctx.product.elevatorPitch}` : ''}
${ctx.promptBlocks.existingStack ? `\n${ctx.promptBlocks.existingStack}` : ''}

Return the rewritten email ONLY (no commentary). Format:
Subject: <subject>
---
<body>`,
        maxOutputTokens: 500,
      });

      const subjectMatch = enhancedEmail.match(/^Subject:\s*(.+)/m);
      const bodyMatch = enhancedEmail.split('---').slice(1).join('---').trim();
      if (subjectMatch?.[1] && bodyMatch) {
        emailSubject = subjectMatch[1].trim();
        emailBody = bodyMatch;
      }
    } catch {
      // Fall back to play-generated email
    }
  }

  // Include sales page link in email body
  if (!emailBody.includes(salesPageUrl) && salesPageUrl) {
    emailBody += `\n\nSee what we put together for your team: ${salesPageUrl}`;
  }

  artifacts.email = { subject: emailSubject, body: emailBody };
  markStep('generate_email', 'completed', `Subject: "${emailSubject}"`);
  yield progress();

  // ---- Step: send_email ----
  markStep('send_email', 'running');
  yield progress();

  if (!ctx.primaryContact?.email) {
    markStep('send_email', 'skipped', 'No contact with email found');
  } else if (!opts?.autonomousEmail) {
    // Queue as PendingAction for approval
    await prisma.pendingAction.create({
      data: {
        type: 'plan_email',
        status: 'pending',
        payload: {
          planType,
          companyId: ctx.company.id,
          contactId: ctx.primaryContact.id,
          to: ctx.primaryContact.email,
          subject: emailSubject,
          body: emailBody,
          salesPageUrl,
        } as unknown as Prisma.InputJsonValue,
        companyId: ctx.company.id,
        contactId: ctx.primaryContact.id,
        userId: ctx.userId,
      },
    });
    markStep('send_email', 'completed', `Queued for approval → ${ctx.primaryContact.email}`);
    artifacts.emailQueued = true;
  } else {
    // Autonomous send
    try {
      const provider = await getOutboundProvider(ctx.userId);
      const result = await provider.send({
        to: ctx.primaryContact.email,
        subject: emailSubject,
        html: emailBody,
        text: emailBody.replace(/<[^>]*>/g, ''),
      });
      if (result.ok) {
        emailSent = true;
        artifacts.emailMessageId = result.messageId;
        // Log activity
        await prisma.activity.create({
          data: {
            type: 'Email',
            summary: `Plan email: ${emailSubject}`,
            content: emailBody,
            companyId: ctx.company.id,
            contactId: ctx.primaryContact.id,
            userId: ctx.userId,
            resendEmailId: result.messageId,
            agentUsed: 'plan_execution',
          },
        });
        markStep('send_email', 'completed', `Sent to ${ctx.primaryContact.email} via ${result.provider}`);
      } else {
        markStep('send_email', 'failed', result.error);
      }
    } catch (err) {
      markStep('send_email', 'failed', err instanceof Error ? err.message : 'Send failed');
    }
  }
  yield progress();

  // ---- Step: create_briefing (if plan type includes it) ----
  if (steps.some((s) => s.id === 'create_briefing')) {
    markStep('create_briefing', 'running');
    yield progress();

    try {
      const token = nanoid(32);
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const briefingPayload = {
        companyName: ctx.company.name,
        industry: ctx.company.industry,
        dealObjective: ctx.company.dealObjective,
        product: ctx.product ? {
          name: ctx.product.name,
          oneLiner: ctx.product.oneLiner,
          framing: ctx.productFraming?.framing,
          framingContext: ctx.productFraming?.context,
        } : null,
        segment: ctx.segment ? {
          name: ctx.segment.name,
          valueProp: ctx.segment.valueProp,
        } : null,
        primaryContact: ctx.primaryContact ? {
          name: ctx.primaryContact.name,
          title: ctx.primaryContact.title,
          email: ctx.primaryContact.email,
        } : null,
        salesPageUrl,
        promptBlocks: {
          existingStack: ctx.promptBlocks.existingStack,
          activeObjections: ctx.promptBlocks.activeObjections,
        },
        generatedAt: new Date().toISOString(),
      };

      await prisma.sharedBriefing.create({
        data: {
          userId: ctx.userId,
          companyId: ctx.company.id,
          token,
          codeHash,
          expiresAt,
          briefingPayload: briefingPayload as unknown as Prisma.InputJsonValue,
        },
      });

      briefingUrl = `${baseUrl}/go/briefing/${token}`;
      artifacts.briefingUrl = briefingUrl;
      artifacts.briefingCode = code;
      markStep('create_briefing', 'completed', `Briefing ready: ${briefingUrl} (code: ${code})`);
    } catch (err) {
      markStep('create_briefing', 'failed', err instanceof Error ? err.message : 'Briefing creation failed');
    }
    yield progress();
  }

  // ---- Step: log_activity ----
  markStep('log_activity', 'running');
  yield progress();

  try {
    await prisma.activity.create({
      data: {
        type: 'PlanExecution',
        summary: `Executed ${planType.replace(/_/g, ' ')} plan${ctx.product ? ` for ${ctx.product.name}` : ''}`,
        content: JSON.stringify({
          planType,
          salesPageUrl,
          emailSent,
          briefingUrl,
          contactCount: ctx.contacts.length,
        }),
        companyId: ctx.company.id,
        userId: ctx.userId,
        agentUsed: 'plan_execution',
      },
    });
    markStep('log_activity', 'completed', 'All activities logged');
  } catch {
    markStep('log_activity', 'completed', 'Activity logging skipped');
  }
  yield progress();

  // Build summary
  const summaryParts: string[] = [
    `**${planType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Plan Executed**`,
    `Account: ${ctx.company.name}`,
  ];
  if (ctx.product) summaryParts.push(`Product: ${ctx.product.name} (${ctx.productFraming?.framing})`);
  if (salesPageUrl) summaryParts.push(`Sales page: ${salesPageUrl}`);
  if (emailSent) {
    summaryParts.push(`Email sent to: ${ctx.primaryContact?.email}`);
  } else if (artifacts.emailQueued) {
    summaryParts.push(`Email queued for approval → ${ctx.primaryContact?.email}`);
  }
  if (briefingUrl) summaryParts.push(`Briefing: ${briefingUrl} (code: ${artifacts.briefingCode})`);

  return {
    success: true,
    salesPageUrl,
    emailSent,
    briefingUrl,
    summary: summaryParts.join('\n'),
    artifacts,
  };
}
