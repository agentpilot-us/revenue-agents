import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { SeedRoadmapConfigButton } from '@/app/dashboard/roadmap/SeedRoadmapConfigButton';
import { SalesMapEditor } from '@/app/dashboard/roadmap/SalesMapEditor';

/**
 * /dashboard/roadmap — Your Sales Map
 *
 * Editable: roadmap type, objective, content strategy (PUT /api/roadmap/config).
 * Read-only: targets, signal rules, action mappings, conditions (managed by flows/tools).
 */

export default async function RoadmapPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard/roadmap');
  }

  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id },
    include: {
      targets: {
        include: {
          company: { select: { name: true } },
          companyDepartment: {
            select: { type: true, customName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      signalRules: { orderBy: { createdAt: 'asc' } },
      actionMappings: { orderBy: { createdAt: 'asc' } },
      conditions: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <h1 className="text-2xl font-semibold mb-3">Your Sales Map</h1>
          <p className="text-muted-foreground mb-4">
            You haven&apos;t configured your Sales Map yet.
          </p>
          <p className="text-muted-foreground/80 mb-4">
            Use the button below to create an example configuration, or use onboarding
            and demo tools. Once configured, you can edit the objective and content
            strategy here.
          </p>
          <SeedRoadmapConfigButton hasNoSignalRules={true} emptyState />
        </div>
      </div>
    );
  }

  const companyTargets = roadmap.targets.filter((t) => t.targetType === 'company');
  const divisionTargets = roadmap.targets.filter((t) => t.targetType === 'division');

  const objective = roadmap.objective as Record<string, unknown> | null;
  const contentStrategy = roadmap.contentStrategy as Record<string, unknown> | null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <SalesMapEditor
          roadmapType={roadmap.roadmapType}
          objective={objective}
          contentStrategy={contentStrategy}
        />

        <div className="mt-10 flex items-center gap-2">
          <SeedRoadmapConfigButton hasNoSignalRules={roadmap.signalRules.length === 0} />
        </div>

        <section className="mt-10 mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Target map
          </h2>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground space-y-3">
            {companyTargets.length === 0 && divisionTargets.length === 0 && (
              <p className="text-muted-foreground text-sm">No targets defined yet.</p>
            )}
            {companyTargets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Companies</p>
                <ul className="space-y-1">
                  {companyTargets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span>
                        {t.company?.name ?? t.name}
                        {t.stage ? <span className="text-muted-foreground"> · {t.stage}</span> : null}
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
                  {divisionTargets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span>
                        {t.companyDepartment?.customName ??
                          t.companyDepartment?.type?.replace(/_/g, ' ') ??
                          t.name}
                        {t.company?.name ? (
                          <span className="text-muted-foreground"> · {t.company.name}</span>
                        ) : null}
                        {t.stage ? <span className="text-muted-foreground"> · {t.stage}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Signal configuration
          </h2>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground">
            {roadmap.signalRules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No signal rules defined yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.signalRules.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.name}</span>{' '}
                    <span className="text-muted-foreground">({r.category})</span>
                    {r.description && (
                      <div className="text-muted-foreground/80 mt-0.5">{r.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Action playbook
          </h2>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground">
            {roadmap.actionMappings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No action mappings defined yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.actionMappings.map((m) => (
                  <li key={m.id}>
                    <span className="font-medium">{m.actionType}</span>
                    {m.signalCategory && (
                      <span className="text-muted-foreground"> · {m.signalCategory}</span>
                    )}
                    <span className="text-muted-foreground">
                      {' '}
                      · autonomy:{' '}
                      <span className="text-amber-400">{m.autonomyLevel}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Conditions &amp; modifiers
          </h2>
          <div className="rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground">
            {roadmap.conditions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No conditions configured.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.conditions.map((c) => (
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
        </section>
      </div>
    </div>
  );
}

