import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getCaseStudiesForUI } from '@/lib/prompt-context';
import { SeedRoadmapConfigButton } from '@/app/dashboard/roadmap/SeedRoadmapConfigButton';
import AccountStoryBar from '@/app/components/roadmap/AccountStoryBar';
import CoverageDashboard from '@/app/components/roadmap/CoverageDashboard';
import BuyingGroupIntelligence from '@/app/components/roadmap/BuyingGroupIntelligence';
import { ActivePlaybooksPanel } from '@/app/components/roadmap/ActivePlaybooksPanel';
import ConfigurationPanel from '@/app/components/roadmap/ConfigurationPanel';
import SAPTabs from '@/app/components/roadmap/SAPTabs';

/**
 * /dashboard/roadmap — Company-scoped Strategic Account Plan
 *
 * ?companyId=xxx  → show that company's plan (3-zone narrative)
 * no companyId    → show a picker of all companies (with existing maps highlighted)
 */

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; play?: string; division?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/roadmap');
  }

  const { companyId, play, division } = await searchParams;

  // ---- No company selected → show company picker ----
  if (!companyId) {
    const [companies, existingMaps] = await Promise.all([
      prisma.company.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, industry: true, accountType: true },
      }),
      prisma.adaptiveRoadmap.findMany({
        where: { userId: session.user.id, companyId: { not: null } },
        select: { companyId: true, updatedAt: true, roadmapType: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const mapByCompany = new Map(existingMaps.map((m) => [m.companyId, m]));

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <h1 className="text-2xl font-semibold mb-2">Strategic Account Plans</h1>
          <p className="text-muted-foreground mb-6">
            Each target account has its own Strategic Account Plan with a tailored objective,
            content strategy, signal rules, and play queue.
          </p>

          {companies.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/80 p-8 text-center">
              <p className="text-muted-foreground mb-3">No target accounts yet.</p>
              <Link
                href="/dashboard/companies"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add your first account
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {companies.map((c) => {
                const existing = mapByCompany.get(c.id);
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/roadmap?companyId=${c.id}`}
                    className="rounded-lg border border-border bg-card/80 p-4 hover:border-primary/40 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      {c.accountType && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          c.accountType === 'partner' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : c.accountType === 'customer' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : c.accountType === 'new_logo' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {c.accountType === 'new_logo' ? 'New Logo' : c.accountType === 'customer' ? 'Customer' : c.accountType === 'partner' ? 'Partner' : 'Prospect'}
                        </span>
                      )}
                    </div>
                    {c.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.industry}</p>
                    )}
                    {existing ? (
                      <span className="inline-flex items-center mt-2 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {existing.roadmapType.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center mt-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        No plan yet
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Company selected → show its Strategic Account Plan ----
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      accountType: true,
      businessOverview: true,
      keyInitiatives: true,
      dealObjective: true,
      segmentationStrategy: true,
      segmentationRationale: true,
    },
  });

  if (!company) {
    redirect('/dashboard/roadmap');
  }

  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id, companyId },
    include: {
      targets: {
        include: {
          company: { select: { id: true, name: true } },
          companyDepartment: {
            select: {
              id: true,
              type: true,
              customName: true,
              status: true,
              useCase: true,
              valueProp: true,
              targetRoles: true,
              searchKeywords: true,
              estimatedOpportunity: true,
              whyThisGroupBuys: true,
              objectionHandlers: true,
              proofPoints: true,
              notes: true,
              _count: { select: { contacts: true } },
              companyProducts: {
                include: {
                  product: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      signalRules: { orderBy: { createdAt: 'asc' } },
      conditions: { orderBy: { createdAt: 'asc' } },
      plans: {
        where: { salesMapTemplateId: { not: null } },
        include: {
          target: {
            select: { id: true, name: true, companyDepartmentId: true },
          },
        },
        orderBy: [{ urgencyScore: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <div className="mb-6">
            <Link href="/dashboard/roadmap" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              &larr; All Strategic Account Plans
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mb-3">
            Strategic Account Plan &mdash; {company.name}
          </h1>
          <p className="text-muted-foreground mb-4">
            No plan configured for {company.name} yet.
          </p>
          <p className="text-muted-foreground/80 mb-4">
            Use the button below to create an example configuration, or use onboarding
            and demo tools. Once configured, you can edit the objective and content
            strategy here.
          </p>
          <SeedRoadmapConfigButton hasNoSignalRules={true} emptyState companyId={companyId} />
        </div>
      </div>
    );
  }

  // ---- Fetch metrics for Zone 1 (The Story) + case studies for Zone 2 ----
  const caseStudies = await getCaseStudiesForUI(session.user.id);

  const [contactCounts, workflowCounts, latestActivity] = await Promise.all([
    prisma.contact.groupBy({
      by: ['companyId'],
      where: { companyId },
      _count: { id: true },
    }).then(async (totalResult) => {
      const total = totalResult[0]?._count?.id ?? 0;
      const engaged = await prisma.contact.count({
        where: { companyId, lastContactedAt: { not: null } },
      });
      return { total, engaged };
    }),

    prisma.actionWorkflow.groupBy({
      by: ['status'],
      where: { companyId, userId: session.user.id },
      _count: { id: true },
    }).then((results) => {
      let completed = 0;
      let total = 0;
      for (const r of results) {
        total += r._count.id;
        if (r.status === 'completed') completed += r._count.id;
      }
      return { completed, total };
    }),

    prisma.activity.findFirst({
      where: { userId: session.user.id, companyId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const daysSinceLastTouch = latestActivity
    ? Math.floor((Date.now() - latestActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // ---- Derive phase progress ----
  const plans = roadmap.plans ?? [];
  const phaseSet = new Set<number>();
  let currentPhaseIndex = 1;
  let currentPhaseName: string | null = null;

  for (const p of plans) {
    const idx = p.phaseIndex ?? 1;
    phaseSet.add(idx);
  }
  const totalPhases = phaseSet.size || 1;

  const sortedPhases = [...phaseSet].sort((a, b) => a - b);
  for (const phaseIdx of sortedPhases) {
    const hasActive = plans.some(
      (p) => (p.phaseIndex ?? 1) === phaseIdx && (p.status === 'pending' || p.status === 'approved'),
    );
    if (hasActive) {
      currentPhaseIndex = phaseIdx;
      currentPhaseName = plans.find((p) => (p.phaseIndex ?? 1) === phaseIdx)?.phaseName ?? null;
      break;
    }
  }

  // Health score: weighted average of plan completion, contact engagement, recency
  const planCompletionRatio = plans.length > 0
    ? plans.filter((p) => p.status === 'executed' || p.status === 'completed').length / plans.length
    : 0;
  const contactEngagementRatio = contactCounts.total > 0
    ? contactCounts.engaged / contactCounts.total
    : 0;
  const recencyScore = daysSinceLastTouch === null ? 0 : daysSinceLastTouch <= 7 ? 1 : daysSinceLastTouch <= 30 ? 0.6 : 0.2;
  const healthScore = Math.round(
    (planCompletionRatio * 40 + contactEngagementRatio * 30 + recencyScore * 30),
  );

  const objective = roadmap.objective as Record<string, unknown> | null;
  const contentStrategy = roadmap.contentStrategy as Record<string, unknown> | null;

  const divisionTargets = roadmap.targets.filter((t: { targetType: string }) => t.targetType === 'division');

  const buyingGroupData = divisionTargets
    .filter((dt) => dt.companyDepartment != null)
    .map((dt) => {
      const d = dt.companyDepartment!;
      return {
        department: {
          id: d.id,
          type: d.type,
          customName: d.customName,
          valueProp: d.valueProp,
          useCase: d.useCase,
          objectionHandlers: d.objectionHandlers as Array<{ objection: string; response: string }> | null,
          targetRoles: d.targetRoles as { economicBuyer?: string[]; technicalEvaluator?: string[]; champion?: string[]; influencer?: string[] } | null,
          searchKeywords: d.searchKeywords as string[] | null,
          estimatedOpportunity: d.estimatedOpportunity,
          _count: d._count,
        },
        products: (d.companyProducts ?? []).map((cp) => ({
          productName: cp.product.name,
          relevance: cp.fitScore != null ? Number(cp.fitScore) : 0,
          talkingPoint: cp.fitReasoning ?? null,
        })),
      };
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard/roadmap" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              &larr; All Strategic Account Plans
            </Link>
            <h1 className="text-2xl font-semibold mt-2">
              {company.name}
            </h1>
          </div>
          <SeedRoadmapConfigButton hasNoSignalRules={roadmap.signalRules.length === 0} companyId={companyId} />
        </div>

        {/* ═══ Hero: Objective + Health + Metrics ═══ */}
        <AccountStoryBar
          objectiveText={(objective?.goalText as string) ?? null}
          accountType={company.accountType}
          healthScore={healthScore}
          currentPhaseIndex={currentPhaseIndex}
          currentPhaseName={currentPhaseName}
          totalPhases={totalPhases}
          contactsEngaged={contactCounts.engaged}
          contactsTotal={contactCounts.total}
          actionsCompleted={workflowCounts.completed}
          actionsTotal={workflowCounts.total}
          daysSinceLastTouch={daysSinceLastTouch}
        />

        {/* ═══ Coverage Dashboard ═══ */}
        <CoverageDashboard companyId={companyId} />

        {/* ═══ Three-Tab Layout ═══ */}
        <SAPTabs
          initialTab={play === 'custom' ? 'plays' : undefined}
          intelligenceContent={
            <BuyingGroupIntelligence
              companyId={companyId}
              businessOverview={company.businessOverview}
              keyInitiatives={company.keyInitiatives as string[] | null}
              divisionTargets={buyingGroupData}
              caseStudies={caseStudies}
            />
          }
          playsContent={
            <ActivePlaybooksPanel roadmapId={roadmap.id} companyId={companyId} companyName={company.name} initialPlayMode={play === 'custom' ? 'custom' : undefined} initialDivisionId={division} />
          }
          configContent={
            <ConfigurationPanel
              roadmapId={roadmap.id}
              roadmapType={roadmap.roadmapType}
              objective={objective}
              contentStrategy={contentStrategy}
              companyId={companyId}
              companyName={company.name}
              conditions={roadmap.conditions.map((c: { id: string; type: string; config: unknown; isActive: boolean }) => ({
                id: c.id,
                type: c.type,
                config: c.config,
                isActive: c.isActive,
              }))}
            />
          }
        />
      </div>
    </div>
  );
}
