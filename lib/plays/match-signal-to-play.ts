/**
 * On signal: resolve play via SignalPlayMapping (and optional AccountPlayActivation),
 * then createPlayRunFromTemplate instead of creating an ActionWorkflow.
 * Supports SignalPlayMapping.conditions: accountTier, accountTiers, arr_gt, arr_lt.
 */

import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from './create-play-run';

export type SignalInput = {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  summary: string;
  relevanceScore: number;
  suggestedPlay: string | null;
};

const PRIORITY_ORDER: Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'> = [
  'URGENT',
  'HIGH',
  'MEDIUM',
  'LOW',
];

type ConditionsContext = {
  accountTier: string | null;
  totalArr: number;
};

/** Conditions JSON: accountTier (string), accountTiers (string[]), arr_gt (number), arr_lt (number). */
function conditionsMatch(conditions: unknown, ctx: ConditionsContext): boolean {
  if (conditions == null || typeof conditions !== 'object') return true;
  const c = conditions as Record<string, unknown>;
  if (c.accountTier != null) {
    const tier = typeof c.accountTier === 'string' ? c.accountTier : String(c.accountTier);
    const normalized = (ctx.accountTier ?? '').toLowerCase();
    if (normalized !== tier.toLowerCase()) return false;
  }
  if (Array.isArray(c.accountTiers) && c.accountTiers.length > 0) {
    const allowed = (c.accountTiers as string[]).map((t) => t.toLowerCase());
    const normalized = (ctx.accountTier ?? '').toLowerCase();
    if (!allowed.includes(normalized)) return false;
  }
  if (typeof c.arr_gt === 'number' && ctx.totalArr <= c.arr_gt) return false;
  if (typeof c.arr_lt === 'number' && ctx.totalArr >= c.arr_lt) return false;
  return true;
}

/**
 * Match a signal to a PlayTemplate via SignalPlayMapping, optionally scoped by
 * AccountPlayActivation for the company's roadmap. Evaluates conditions (accountTier, arr_gt/arr_lt).
 * Creates a PlayRun when a match is found.
 */
export async function matchSignalToPlayRun(signal: SignalInput): Promise<{ created: boolean; playRunId?: string }> {
  const signalTypeNorm = signal.type.trim().toLowerCase();

  const [mappings, roadmap, companyContext] = await Promise.all([
    prisma.signalPlayMapping.findMany({
      where: {
        userId: signal.userId,
        playTemplate: { status: 'ACTIVE' },
      },
      include: {
        playTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.adaptiveRoadmap.findFirst({
      where: { userId: signal.userId, companyId: signal.companyId },
      select: { id: true },
    }),
    prisma.company.findFirst({
      where: { id: signal.companyId, userId: signal.userId },
      select: { accountType: true },
    }),
  ]);

  const [arrResult] = await prisma.companyProduct.aggregate({
    where: { companyId: signal.companyId },
    _sum: { arr: true },
  });
  const totalArr = Number(arrResult?._sum?.arr ?? 0);
  const conditionsContext: ConditionsContext = {
    accountTier: companyContext?.accountType ?? null,
    totalArr,
  };

  const matchingMappings = mappings.filter((m) => {
    const mappingType = m.signalType.trim().toLowerCase();
    const typeMatch =
      mappingType === signalTypeNorm ||
      signalTypeNorm.includes(mappingType) ||
      mappingType.includes(signalTypeNorm);
    if (!typeMatch) return false;
    return conditionsMatch(m.conditions, conditionsContext);
  });

  if (matchingMappings.length === 0) return { created: false };

  let candidate = matchingMappings[0];
  if (roadmap) {
    const activations = await prisma.accountPlayActivation.findMany({
      where: { roadmapId: roadmap.id, isActive: true },
      select: { playTemplateId: true },
    });
    const allowedIds = new Set(activations.map((a) => a.playTemplateId));
    const allowed = matchingMappings.filter((m) => allowedIds.has(m.playTemplateId));
    if (allowed.length > 0) {
      candidate = allowed.sort(
        (a, b) =>
          PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
      )[0];
    } else {
      return { created: false };
    }
  } else {
    candidate = matchingMappings.sort(
      (a, b) =>
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    )[0];
  }

  let targetContact: { name: string; email?: string | null; title?: string | null } | null =
    null;
  if (roadmap) {
    const target = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id },
      include: {
        contacts: {
          take: 1,
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true, title: true },
            },
          },
        },
      },
    });
    const firstContact = target?.contacts?.[0]?.contact ?? null;
    if (firstContact) {
      targetContact = {
        name: [firstContact.firstName, firstContact.lastName].filter(Boolean).join(' ') || 'Unknown',
        email: firstContact.email,
        title: firstContact.title,
      };
    }
  }

  const playRun = await createPlayRunFromTemplate({
    userId: signal.userId,
    companyId: signal.companyId,
    playTemplateId: candidate.playTemplateId,
    accountSignalId: signal.id,
    targetContact,
  });

  await prisma.accountSignal
    .update({
      where: { id: signal.id },
      data: { status: 'acted' },
    })
    .catch(() => {});

  return { created: true, playRunId: playRun.id };
}
