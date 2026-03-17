/**
 * Deterministic next-best-play recommender.
 *
 * Scores approved plays (AccountPlayActivation + PlayTemplate) against current
 * account state to recommend which play an AE should run next — no LLM call needed.
 *
 * Scoring factors:
 *   - Coverage gaps (divisions with few contacts or low engagement)
 *   - Signal alignment (recent signal matches the play's trigger type)
 *   - Recency penalty (same play type already ran recently)
 *   - Opportunity size (estimated revenue potential of the division)
 *   - Objective alignment (play serves the deal objective)
 */

import { prisma } from '@/lib/db';

export type RecommendedPlay = {
  accountPlayActivationId: string;
  /** PlayTemplate id — use for POST /api/play-runs */
  playTemplateId: string;
  templateId: string;
  templateName: string;
  triggerType: string | null;
  priority: number;
  expectedOutcome: string | null;
  score: number;
  reasons: string[];
  targetDivision: {
    id: string;
    name: string;
    type: string;
    contactCount: number;
    estimatedOpportunity: string | null;
    stage: string | null;
  } | null;
  stepCount: number;
  stepPreview: string[];
};

type DivisionState = {
  id: string;
  name: string;
  type: string;
  contactCount: number;
  estimatedOpportunity: string | null;
  whyThisGroupBuys: string | null;
  stage: string | null;
  lastActivityDaysAgo: number | null;
  recentWorkflowCount: number;
};

export async function getNextBestPlays(
  userId: string,
  companyId: string,
  limit = 5,
): Promise<RecommendedPlay[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [roadmap, company, recentActivities, recentPlayRuns, recentSignals] =
    await Promise.all([
      prisma.adaptiveRoadmap.findFirst({
        where: { userId, companyId },
        include: {
          accountPlayActivations: {
            where: { isActive: true },
            include: {
              playTemplate: {
                select: {
                  id: true,
                  name: true,
                  triggerType: true,
                  category: true,
                  description: true,
                  phases: {
                    orderBy: { orderIndex: 'asc' },
                    take: 5,
                    select: { name: true },
                  },
                },
              },
            },
          },
          targets: {
            include: {
              companyDepartment: {
                select: {
                  id: true,
                  type: true,
                  customName: true,
                  estimatedOpportunity: true,
                  whyThisGroupBuys: true,
                  _count: { select: { contacts: true } },
                },
              },
            },
          },
        },
      }),

      prisma.company.findFirst({
        where: { id: companyId, userId },
        select: { dealObjective: true, name: true },
      }),

      prisma.activity.findMany({
        where: { userId, companyId, createdAt: { gte: thirtyDaysAgo } },
        select: {
          companyDepartmentId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.playRun.findMany({
        where: {
          userId,
          companyId,
          createdAt: { gte: sevenDaysAgo },
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
        select: {
          playTemplateId: true,
          createdAt: true,
        },
      }),

      prisma.accountSignal.findMany({
        where: {
          userId,
          companyId,
          status: 'new',
          publishedAt: { gte: sevenDaysAgo },
        },
        select: { type: true, title: true, relevanceScore: true },
        orderBy: { relevanceScore: 'desc' },
        take: 10,
      }),

    ]);

  const activations = roadmap?.accountPlayActivations ?? [];
  if (!roadmap || activations.length === 0) return [];

  const divisionStates = buildDivisionStates(
    roadmap.targets,
    recentActivities,
    recentPlayRuns.map((r) => ({ templateId: r.playTemplateId, targetDivisionId: null, createdAt: r.createdAt })),
  );

  const signalTypes = new Set(recentSignals.map((s) => s.type));
  const dealObjective = company?.dealObjective?.toLowerCase() ?? '';

  const scored: RecommendedPlay[] = [];

  for (const activation of activations) {
    const tmpl = activation.playTemplate;
    const stepPreview = tmpl.phases.map((p) => p.name).slice(0, 4);
    const stepCount = tmpl.phases.length;

    for (const div of divisionStates) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Coverage gap: fewer contacts = higher priority
      if (div.contactCount === 0) {
        score += 35;
        reasons.push('No contacts yet — needs introduction');
      } else if (div.contactCount < 3) {
        score += 20;
        reasons.push(`Only ${div.contactCount} contact${div.contactCount > 1 ? 's' : ''} — expand coverage`);
      }

      // 2. Engagement recency: no recent activity = stale
      if (div.lastActivityDaysAgo === null) {
        score += 25;
        reasons.push('No prior outreach to this division');
      } else if (div.lastActivityDaysAgo > 21) {
        score += 20;
        reasons.push(`Last touch ${div.lastActivityDaysAgo}d ago — going cold`);
      } else if (div.lastActivityDaysAgo > 7) {
        score += 10;
        reasons.push(`Last touch ${div.lastActivityDaysAgo}d ago`);
      }

      // 3. Signal alignment
      if (tmpl.triggerType && signalTypes.has(tmpl.triggerType)) {
        score += 30;
        const matchingSignal = recentSignals.find((s) => s.type === tmpl.triggerType);
        reasons.push(`Signal match: ${matchingSignal?.title ?? tmpl.triggerType.replace(/_/g, ' ')}`);
      }

      // 4. Recency penalty — don't re-suggest same play this week
      const recentSamePlay = recentPlayRuns.filter((r) => r.playTemplateId === tmpl.id);
      if (recentSamePlay.length > 0) {
        score -= 50;
      }

      // 5. Opportunity size
      const oppValue = parseOpportunityValue(div.estimatedOpportunity);
      if (oppValue > 1_000_000) {
        score += 15;
        reasons.push(`High-value: ${div.estimatedOpportunity}`);
      } else if (oppValue > 500_000) {
        score += 10;
      }

      // 6. Category/priority boost (PlayTemplate has category, no priority field — use fixed boost)
      score += 10;

      // 7. Objective alignment (keyword match)
      if (dealObjective && tmpl.description) {
        const descLower = (tmpl.description ?? '').toLowerCase();
        const objectiveWords = dealObjective.split(/\s+/).filter((w) => w.length > 3);
        const matches = objectiveWords.filter((w) => descLower.includes(w)).length;
        if (matches > 0) {
          score += matches * 5;
          reasons.push('Aligns with account objective');
        }
      }

      // 8. Stage-based boost: earlier stages need more outreach
      if (div.stage === 'discovery' || div.stage === 'awareness') {
        score += 10;
      }

      if (score <= 0) continue;

      scored.push({
        accountPlayActivationId: activation.id,
        playTemplateId: tmpl.id,
        templateId: tmpl.id,
        templateName: tmpl.name,
        triggerType: tmpl.triggerType,
        priority: 10,
        expectedOutcome: null,
        score,
        reasons: reasons.slice(0, 3),
        targetDivision: {
          id: div.id,
          name: div.name,
          type: div.type,
          contactCount: div.contactCount,
          estimatedOpportunity: div.estimatedOpportunity,
          stage: div.stage,
        },
        stepCount,
        stepPreview,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Deduplicate: keep only the best division per template
  const seen = new Set<string>();
  const deduped: RecommendedPlay[] = [];
  for (const rec of scored) {
    const key = `${rec.templateId}::${rec.targetDivision?.id ?? 'none'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(rec);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

function buildDivisionStates(
  targets: Array<{
    id: string;
    stage: string | null;
    companyDepartmentId: string | null;
    companyDepartment: {
      id: string;
      type: string;
      customName: string | null;
      estimatedOpportunity: string | null;
      whyThisGroupBuys: string | null;
      _count: { contacts: number };
    } | null;
  }>,
  activities: Array<{ companyDepartmentId: string | null; createdAt: Date }>,
  workflows: Array<{ targetDivisionId: string | null; createdAt: Date }>,
): DivisionState[] {
  const now = Date.now();

  return targets
    .filter((t) => t.companyDepartment != null)
    .map((t) => {
      const dept = t.companyDepartment!;
      const deptActivities = activities.filter(
        (a) => a.companyDepartmentId === dept.id,
      );
      const latestActivity =
        deptActivities.length > 0 ? deptActivities[0].createdAt : null;
      const lastActivityDaysAgo = latestActivity
        ? Math.floor((now - latestActivity.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const recentWorkflowCount = workflows.filter(
        (wf) => wf.targetDivisionId === dept.id,
      ).length;

      return {
        id: dept.id,
        name: dept.customName || dept.type.replace(/_/g, ' '),
        type: dept.type,
        contactCount: dept._count.contacts,
        estimatedOpportunity: dept.estimatedOpportunity,
        whyThisGroupBuys: dept.whyThisGroupBuys,
        stage: t.stage,
        lastActivityDaysAgo,
        recentWorkflowCount,
      };
    });
}

function parseOpportunityValue(opp: string | null): number {
  if (!opp) return 0;
  const match = opp.match(/\$?([\d,.]+)\s*[MmKk]?/);
  if (!match) return 0;
  let val = parseFloat(match[1].replace(/,/g, ''));
  if (/M/i.test(opp)) val *= 1_000_000;
  if (/K/i.test(opp)) val *= 1_000;
  return val;
}
