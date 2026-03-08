/**
 * Assembles an ActionWorkflow from a PlaybookTemplate + account context.
 *
 * Reuses:
 * - PlaybookTemplate query for step definitions
 * - buildExistingStackBlock() for account context
 * - calculateWorkflowUrgency() for scoring
 */

import { prisma } from '@/lib/db';
import { buildExistingStackBlock } from '@/lib/products/resolve-product-framing';
import { calculateWorkflowUrgency } from './urgency';

export type AssembleWorkflowInput = {
  userId: string;
  companyId: string;
  templateId: string;
  roadmapPlanId?: string;
  accountSignalId?: string;
  targetDivisionId?: string;
  targetContactId?: string;
  campaignId?: string;
  title?: string;
  description?: string;
  eventContext?: Record<string, unknown>;
};

export async function assembleWorkflow(input: AssembleWorkflowInput) {
  const {
    userId,
    companyId,
    templateId,
    roadmapPlanId,
    accountSignalId,
    campaignId,
    eventContext,
  } = input;
  let { targetDivisionId, targetContactId } = input;

  const [template, company, signal, existingProducts, signals] = await Promise.all([
    prisma.playbookTemplate.findUnique({
      where: { id: templateId },
      include: { steps: { orderBy: { order: 'asc' } } },
    }),
    prisma.company.findFirst({
      where: { id: companyId, userId },
      select: {
        id: true,
        name: true,
        industry: true,
        activeObjections: true,
      },
    }),
    accountSignalId
      ? prisma.accountSignal.findUnique({ where: { id: accountSignalId } })
      : null,
    prisma.companyProduct.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      select: { contractRenewalDate: true },
    }),
    prisma.accountSignal.findMany({
      where: { companyId },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: { type: true, publishedAt: true, relevanceScore: true },
    }),
  ]);

  if (!template) throw new Error('PlaybookTemplate not found');
  if (!company) throw new Error('Company not found');

  const stackBlock = await buildExistingStackBlock(companyId, userId);

  const signalContext = signal
    ? {
        signalId: signal.id,
        type: signal.type,
        title: signal.title,
        summary: signal.summary,
        relevanceScore: signal.relevanceScore,
        publishedAt: signal.publishedAt,
      }
    : null;

  const accountContext: Record<string, unknown> = {
    companyName: company.name,
    industry: company.industry,
    existingStack: stackBlock,
  };

  if (eventContext) {
    accountContext.event = eventContext;
  }

  // Auto-resolve contact from signal for person-specific signal types
  if (signal && !targetContactId) {
    const resolved = await resolveContactFromSignal(signal, companyId);
    if (resolved) {
      targetContactId = resolved.contactId;
      if (!targetDivisionId && resolved.divisionId) {
        targetDivisionId = resolved.divisionId;
      }
    }
  }

  const activeObjections = parseObjections(company.activeObjections);

  const urgencyScore = calculateWorkflowUrgency({
    phaseIndex: 1,
    previewPayload: signal
      ? { triggerSignalType: signal.type }
      : null,
    triggerSignal: signal
      ? { type: signal.type, publishedAt: signal.publishedAt, relevanceScore: signal.relevanceScore }
      : null,
    signals,
    existingProducts,
    activeObjections,
  });

  // Dedup: prevent same contact + template combo from being enrolled twice
  if (targetContactId && templateId) {
    const existingActive = await prisma.actionWorkflow.findFirst({
      where: {
        userId,
        companyId,
        targetContactId,
        templateId,
        status: { in: ['pending', 'in_progress'] },
      },
      select: { id: true, title: true },
    });
    if (existingActive) {
      const err = new Error(`Contact already in active play: ${existingActive.title}`);
      (err as Error & { code: string; existingWorkflowId: string }).code = 'DUPLICATE_ENROLLMENT';
      (err as Error & { existingWorkflowId: string }).existingWorkflowId = existingActive.id;
      throw err;
    }
  }

  const title =
    input.title ||
    (signal
      ? `${template.name}: ${signal.title}`
      : `${template.name} — ${company.name}`);
  const description =
    input.description || template.description || undefined;

  const workflow = await prisma.actionWorkflow.create({
    data: {
      userId,
      companyId,
      templateId,
      campaignId: campaignId || undefined,
      roadmapPlanId: roadmapPlanId || undefined,
      accountSignalId: accountSignalId || undefined,
      targetDivisionId: targetDivisionId || undefined,
      targetContactId: targetContactId || undefined,
      title,
      description,
      status: 'pending',
      urgencyScore,
      signalContext: signalContext ?? undefined,
      accountContext,
      steps: {
        create: template.steps.map((step) => ({
          stepOrder: step.order,
          stepType: mapStepType(step),
          contentType: mapContentType(step),
          channel: step.channel || undefined,
          contactId: targetContactId || undefined,
          divisionId: targetDivisionId || undefined,
          promptHint: step.promptHint || undefined,
          dueAt: computeDueAt(step.dayOffset),
          status: 'pending',
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });

  return workflow;
}

function mapStepType(step: {
  channel?: string | null;
  assetTypes?: unknown;
  playId?: string | null;
}): string {
  const channel = step.channel?.toLowerCase();
  if (channel === 'meeting') return 'create_meeting';
  if (channel === 'task' || channel === 'internal') return 'manual_task';

  const assetTypes = Array.isArray(step.assetTypes) ? step.assetTypes : [];
  if (assetTypes.length > 0 || step.playId) return 'generate_content';

  return 'manual_task';
}

function mapContentType(step: {
  assetTypes?: unknown;
  channel?: string | null;
}): string | undefined {
  const assetTypes = Array.isArray(step.assetTypes)
    ? (step.assetTypes as string[])
    : [];

  if (assetTypes.includes('email')) return 'email';
  if (assetTypes.includes('linkedin')) return 'linkedin_inmail';
  if (assetTypes.includes('linkedin_post')) return 'linkedin_post';
  if (assetTypes.includes('talking_points')) return 'talking_points';
  if (assetTypes.includes('presentation')) return 'presentation';
  if (assetTypes.includes('ad_brief')) return 'ad_brief';

  const channel = step.channel?.toLowerCase();
  if (channel === 'email') return 'email';
  if (channel === 'linkedin') return 'linkedin_inmail';
  if (channel === 'ad_brief') return 'ad_brief';

  return undefined;
}

function computeDueAt(dayOffset: number | null | undefined): Date {
  const now = new Date();
  if (!dayOffset || dayOffset <= 0) return now;
  return new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
}

function parseObjections(
  raw: unknown
): Array<{ severity?: string; status?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is { severity?: string; status?: string } =>
      item != null && typeof item === 'object',
  );
}

const PERSON_SIGNAL_TYPES = new Set([
  'executive_hire',
  'new_csuite_executive',
  'new_vp_hire',
  'executive_departure',
  'founder_stepping_down',
  'champion_promoted',
  'multiple_dept_heads_hired',
]);

/**
 * For person-specific signals (executive hires, promotions, etc.), extract the
 * person's name from the signal text and match against contacts in the account.
 * Returns the contactId and divisionId if a match is found.
 */
async function resolveContactFromSignal(
  signal: { type: string; title: string; summary: string },
  companyId: string,
): Promise<{ contactId: string; divisionId: string | null } | null> {
  if (!PERSON_SIGNAL_TYPES.has(signal.type)) return null;

  const contacts = await prisma.contact.findMany({
    where: { companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      companyDepartmentId: true,
    },
  });

  if (contacts.length === 0) return null;

  const text = `${signal.title} ${signal.summary}`.toLowerCase();

  // Match by full name appearing in the signal text
  for (const c of contacts) {
    if (!c.firstName || !c.lastName) continue;
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    if (text.includes(fullName)) {
      return { contactId: c.id, divisionId: c.companyDepartmentId };
    }
  }

  // Match by title appearing in signal text (less precise, only for exact title matches)
  for (const c of contacts) {
    if (!c.title) continue;
    const titleLower = c.title.toLowerCase();
    if (titleLower.length > 15 && text.includes(titleLower)) {
      return { contactId: c.id, divisionId: c.companyDepartmentId };
    }
  }

  return null;
}
