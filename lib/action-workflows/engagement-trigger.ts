/**
 * Creates ActionWorkflows from high-value engagement events
 * (CampaignVisit alerts, CTA clicks, form submissions, executive visits).
 *
 * Called inline from lib/alerts/trigger.ts for real-time responsiveness,
 * and from the cron catch-all for anything missed.
 */

import { prisma } from '@/lib/db';

type EngagementInput = {
  userId: string;
  companyId: string;
  visitId: string;
  alertType: string;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorTitle: string | null;
  campaignName: string;
  departmentId?: string | null;
};

const ALERT_URGENCY: Record<string, number> = {
  EXECUTIVE_VISIT: 160,
  HIGH_VALUE_VISITOR: 140,
  FORM_SUBMISSION: 150,
  CTA_CLICKED: 120,
  MULTIPLE_CHAT_MESSAGES: 130,
  RETURNING_VISITOR: 110,
};

const STEP_BLUEPRINTS: Record<string, Array<{ stepOrder: number; stepType: string; contentType?: string; channel?: string; promptHint: string }>> = {
  EXECUTIVE_VISIT: [
    { stepOrder: 1, stepType: 'generate_content', contentType: 'talking_points', channel: 'task', promptHint: 'Prepare a brief on this executive: their background, likely priorities, and how our products align. Reference the page they visited.' },
    { stepOrder: 2, stepType: 'generate_content', contentType: 'email', channel: 'email', promptHint: 'Draft a personalized follow-up email to this executive referencing their visit to our content. Keep it concise and executive-appropriate.' },
    { stepOrder: 3, stepType: 'generate_content', contentType: 'linkedin_inmail', channel: 'linkedin', promptHint: 'Draft a LinkedIn connection request with a brief note referencing shared context from their page visit.' },
  ],
  HIGH_VALUE_VISITOR: [
    { stepOrder: 1, stepType: 'generate_content', contentType: 'talking_points', channel: 'task', promptHint: 'Summarize what this visitor engaged with and suggest talking points for follow-up.' },
    { stepOrder: 2, stepType: 'generate_content', contentType: 'email', channel: 'email', promptHint: 'Draft a follow-up email referencing the specific content they viewed. Include a relevant case study or next step.' },
  ],
  FORM_SUBMISSION: [
    { stepOrder: 1, stepType: 'generate_content', contentType: 'email', channel: 'email', promptHint: 'Draft a prompt response to this form submission. Thank them, address their likely interest, and propose a next step.' },
    { stepOrder: 2, stepType: 'manual_task', channel: 'task', promptHint: 'Schedule a discovery call within 48 hours.' },
  ],
  CTA_CLICKED: [
    { stepOrder: 1, stepType: 'generate_content', contentType: 'email', channel: 'email', promptHint: 'Draft a follow-up email to this engaged visitor who clicked the CTA. Reference what they were viewing and suggest a next step.' },
  ],
  MULTIPLE_CHAT_MESSAGES: [
    { stepOrder: 1, stepType: 'generate_content', contentType: 'talking_points', channel: 'task', promptHint: 'Review the chat conversation and summarize key questions, concerns, and intent signals from this visitor.' },
    { stepOrder: 2, stepType: 'generate_content', contentType: 'email', channel: 'email', promptHint: 'Draft a follow-up email that addresses the topics discussed in the chat and proposes a meeting.' },
  ],
  RETURNING_VISITOR: [
    { stepOrder: 1, stepType: 'generate_content', contentType: 'email', channel: 'email', promptHint: 'Draft a re-engagement email for this returning visitor. Mention new content or developments since their last visit.' },
  ],
};

export async function createEngagementWorkflow(input: EngagementInput): Promise<string | null> {
  const { userId, companyId, visitId, alertType, visitorName, visitorEmail, visitorTitle, campaignName, departmentId } = input;

  // Dedup: skip if a workflow was already created for this visit
  const existing = await prisma.actionWorkflow.findFirst({
    where: {
      userId,
      companyId,
      accountContext: { path: ['visitId'], equals: visitId },
    },
    select: { id: true },
  });
  if (existing) return null;

  // Try to match the visitor to an existing contact
  let contactId: string | undefined;
  if (visitorEmail) {
    const contact = await prisma.contact.findFirst({
      where: { companyId, email: visitorEmail },
      select: { id: true },
    });
    if (contact) contactId = contact.id;
  }

  const title = buildTitle(alertType, visitorName, campaignName);
  const urgency = ALERT_URGENCY[alertType] ?? 100;
  const steps = STEP_BLUEPRINTS[alertType] ?? STEP_BLUEPRINTS.HIGH_VALUE_VISITOR;

  const workflow = await prisma.actionWorkflow.create({
    data: {
      userId,
      companyId,
      targetDivisionId: departmentId || undefined,
      targetContactId: contactId,
      title,
      description: `Auto-created from ${alertType.replace(/_/g, ' ').toLowerCase()} alert on "${campaignName}"`,
      status: 'pending',
      urgencyScore: urgency,
      signalContext: {
        source: 'engagement_alert',
        alertType,
        campaignName,
        visitorName,
        visitorEmail,
        visitorTitle,
      },
      accountContext: {
        visitId,
        campaignName,
        triggerType: 'engagement',
      },
      steps: {
        create: steps.map((s) => ({
          stepOrder: s.stepOrder,
          stepType: s.stepType,
          contentType: s.contentType || undefined,
          channel: s.channel || undefined,
          contactId: contactId,
          divisionId: departmentId || undefined,
          promptHint: s.promptHint,
          status: 'pending',
        })),
      },
    },
    select: { id: true },
  });

  return workflow.id;
}

function buildTitle(alertType: string, visitorName: string | null, campaignName: string): string {
  const name = visitorName || 'Unknown visitor';
  switch (alertType) {
    case 'EXECUTIVE_VISIT':
      return `Executive Visit: ${name} on "${campaignName}"`;
    case 'HIGH_VALUE_VISITOR':
      return `Engagement: ${name} visited "${campaignName}"`;
    case 'FORM_SUBMISSION':
      return `Form Submitted: ${name} on "${campaignName}"`;
    case 'CTA_CLICKED':
      return `CTA Clicked: ${name} on "${campaignName}"`;
    case 'MULTIPLE_CHAT_MESSAGES':
      return `Chat Engaged: ${name} on "${campaignName}"`;
    case 'RETURNING_VISITOR':
      return `Returning Visitor: ${name} on "${campaignName}"`;
    default:
      return `Engagement Alert: ${name} on "${campaignName}"`;
  }
}
