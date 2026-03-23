/**
 * Creates PlayRuns from high-value engagement events
 * (CampaignVisit alerts, CTA clicks, form submissions, executive visits).
 *
 * Called from lib/alerts/trigger.ts and cron/action-workflow-triggers.
 * Uses PlayTemplate + createPlayRunFromTemplate; dedup via AccountSignal (metadata.visitId).
 */

import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

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

/** Create a PlayRun for an engagement alert. Returns playRunId or null if skipped/deduped. */
export async function createEngagementWorkflow(input: EngagementInput): Promise<string | null> {
  const { userId, companyId, visitId, alertType, visitorName, campaignName } = input;

  const title = buildTitle(alertType, visitorName, campaignName);

  const existingSignal = await prisma.accountSignal.findFirst({
    where: {
      userId,
      companyId,
      type: 'internal_engagement_trigger',
      metadata: { path: ['visitId'], equals: visitId },
    },
    select: { id: true },
  });
  if (existingSignal) {
    const existingRun = await prisma.playRun.findFirst({
      where: { accountSignalId: existingSignal.id },
      select: { id: true },
    });
    if (existingRun) return null;
  }

  const signal = existingSignal
    ? { id: existingSignal.id }
    : await prisma.accountSignal.create({
        data: {
          userId,
          companyId,
          type: 'internal_engagement_trigger',
          title,
          summary: `Engagement: ${alertType.replace(/_/g, ' ')} on "${campaignName}"`,
          url: '',
          publishedAt: new Date(),
          relevanceScore: 8,
          metadata: { visitId } as object,
        },
        select: { id: true },
      });

  const template = await prisma.playTemplate.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { triggerType: 'SIGNAL' },
        { name: { contains: 'Engagement', mode: 'insensitive' } },
        { name: { contains: 'Follow-up', mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  if (!template) return null;

  const playRun = await createPlayRunFromTemplate({
    userId,
    companyId,
    playTemplateId: template.id,
    accountSignalId: signal.id,
    title,
  });
  return playRun.id;
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
