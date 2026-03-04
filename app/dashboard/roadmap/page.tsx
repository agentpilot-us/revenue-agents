import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { SeedRoadmapConfigButton } from '@/app/dashboard/roadmap/SeedRoadmapConfigButton';
import { SalesMapEditor } from '@/app/dashboard/roadmap/SalesMapEditor';
import { SalesMapTemplatePicker } from '@/app/components/roadmap/SalesMapTemplatePicker';
import { PhasedPlanView } from '@/app/components/roadmap/PhasedPlanView';
import { SignalConfigPanel } from '@/app/components/roadmap/SignalConfigPanel';
import { ActionMappingEditor } from '@/app/components/roadmap/ActionMappingEditor';

/**
 * /dashboard/roadmap — Company-scoped Sales Map
 *
 * ?companyId=xxx  → show that company's Sales Map
 * no companyId    → show a picker of all companies (with existing maps highlighted)
 */

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/roadmap');
  }

  const { companyId } = await searchParams;

  // ---- No company selected → show company picker ----
  if (!companyId) {
    const [companies, existingMaps] = await Promise.all([
      prisma.company.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, industry: true },
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
          <h1 className="text-2xl font-semibold mb-2">Sales Maps</h1>
          <p className="text-muted-foreground mb-6">
            Each target account has its own Sales Map with a tailored objective,
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
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    {c.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.industry}</p>
                    )}
                    {existing ? (
                      <span className="inline-flex items-center mt-2 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {existing.roadmapType.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center mt-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        No Sales Map yet
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

  // ---- Company selected → show its Sales Map ----
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
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
            select: { id: true, type: true, customName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      signalRules: { orderBy: { createdAt: 'asc' } },
      actionMappings: { orderBy: { createdAt: 'asc' } },
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
              &larr; All Sales Maps
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mb-3">
            Sales Map &mdash; {company.name}
          </h1>
          <p className="text-muted-foreground mb-4">
            No Sales Map configured for {company.name} yet.
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

  const companyTargets = roadmap.targets.filter((t: { targetType: string }) => t.targetType === 'company');
  const divisionTargets = roadmap.targets.filter((t: { targetType: string }) => t.targetType === 'division');
  const salesMapPlans = roadmap.plans ?? [];
  const primaryTarget = divisionTargets[0] ?? companyTargets[0];

  const objective = roadmap.objective as Record<string, unknown> | null;
  const contentStrategy = roadmap.contentStrategy as Record<string, unknown> | null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-4">
          <Link href="/dashboard/roadmap" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            &larr; All Sales Maps
          </Link>
        </div>

        <SalesMapEditor
          roadmapType={roadmap.roadmapType}
          objective={objective}
          contentStrategy={contentStrategy}
          companyId={companyId}
          companyName={company.name}
        />

        <div className="mt-10 flex items-center gap-2">
          <SeedRoadmapConfigButton hasNoSignalRules={roadmap.signalRules.length === 0} companyId={companyId} />
        </div>

        <section className="mt-10 mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Target Map
          </h2>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground space-y-3">
            {companyTargets.length === 0 && divisionTargets.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-2">No target accounts added yet.</p>
                <a
                  href="/dashboard/companies"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Add target accounts
                </a>
              </div>
            )}
            {companyTargets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Companies</p>
                <ul className="space-y-1">
                  {companyTargets.map((t: { id: string; company?: { name: string } | null; name: string; stage?: string | null }) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span>
                        {t.company?.name ?? t.name}
                        {t.stage ? <span className="text-muted-foreground"> &middot; {t.stage}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {divisionTargets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Divisions</p>
                <ul className="space-y-1">
                  {divisionTargets.map((t: { id: string; companyDepartment?: { customName?: string | null; type?: string | null } | null; company?: { name: string } | null; name: string; stage?: string | null }) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span>
                        {t.companyDepartment?.customName ??
                          t.companyDepartment?.type?.replace(/_/g, ' ') ??
                          t.name}
                        {t.company?.name ? (
                          <span className="text-muted-foreground"> &middot; {t.company.name}</span>
                        ) : null}
                        {t.stage ? <span className="text-muted-foreground"> &middot; {t.stage}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Play Queue */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Play Queue
          </h2>

          {primaryTarget && (
            <div className="mb-4">
              <SalesMapTemplatePicker
                roadmapId={roadmap.id}
                targetId={primaryTarget.id}
                targetLabel={
                  (primaryTarget as { companyDepartment?: { customName?: string | null; type?: string | null } | null }).companyDepartment?.customName ??
                  (primaryTarget as { companyDepartment?: { customName?: string | null; type?: string | null } | null }).companyDepartment?.type?.replace(/_/g, ' ') ??
                  (primaryTarget as { company?: { name: string } | null }).company?.name ??
                  primaryTarget.name
                }
              />
            </div>
          )}

          <div className="rounded-lg border border-border bg-card/80 p-4">
            <PhasedPlanView
              plans={salesMapPlans.map((p: { id: string; status: string; phaseIndex: number | null; phaseName: string | null; urgencyScore: number | null; previewPayload: unknown; target: { id: string; name: string; companyDepartmentId: string | null } | null }) => ({
                id: p.id,
                status: p.status,
                phaseIndex: p.phaseIndex,
                phaseName: p.phaseName,
                urgencyScore: p.urgencyScore,
                previewPayload: p.previewPayload as Record<string, unknown> | null,
                target: p.target ? {
                  id: p.target.id,
                  name: p.target.name,
                  companyDepartmentId: p.target.companyDepartmentId,
                } : null,
              }))}
              companyId={companyId}
            />
          </div>
        </section>

        <details className="mb-8 group">
          <summary className="cursor-pointer list-none flex items-center gap-2 mb-2">
            <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Signal Configuration
            </span>
            {roadmap.signalRules.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60">{roadmap.signalRules.length} rules</span>
            )}
          </summary>

          {roadmap.signalRules.length > 0 && (
            <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Signal Rules
              </p>
              <ul className="space-y-2 text-xs">
                {roadmap.signalRules.map((r: { id: string; name: string; category: string; description: string | null }) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.name}</span>{' '}
                    <span className="text-muted-foreground">({r.category})</span>
                    {r.description && (
                      <div className="text-muted-foreground/80 mt-0.5">{r.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Custom Signal Sources
            </p>
            <SignalConfigPanel />
          </div>
        </details>

        <details className="mb-8 group">
          <summary className="cursor-pointer list-none flex items-center gap-2 mb-2">
            <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Play Rules
            </span>
          </summary>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground">
            <ActionMappingEditor roadmapId={roadmap.id} />
          </div>
        </details>

        <details className="mb-8 group">
          <summary className="cursor-pointer list-none flex items-center gap-2 mb-2">
            <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conditions &amp; Modifiers
            </span>
            {roadmap.conditions.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60">{roadmap.conditions.length} active</span>
            )}
          </summary>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground">
            {roadmap.conditions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No conditions configured.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.conditions.map((c: { id: string; type: string; isActive: boolean }) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.type}</span>{' '}
                    <span className="text-muted-foreground">
                      ({c.isActive ? 'active' : 'inactive'})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
