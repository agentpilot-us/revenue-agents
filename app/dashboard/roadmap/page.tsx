import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * /dashboard/roadmap
 *
 * High-level view of the current AE's Adaptive Roadmap.
 * v1 is intentionally simple: it shows the six components in a read-only
 * way so we can wire up the rest of the system. Conversational setup and
 * richer editing can build on this.
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
      <div className="min-h-screen bg-zinc-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <h1 className="text-2xl font-semibold mb-3">Your Adaptive Roadmap</h1>
          <p className="text-slate-300 mb-4">
            You haven&apos;t configured your Adaptive Roadmap yet.
          </p>
          <p className="text-slate-400">
            Use the onboarding or demo tools to create a Roadmap template for your
            selling motion. Once configured, this page will show how your Roadmap
            defines targets, signals, actions, content strategy, and conditions.
          </p>
        </div>
      </div>
    );
  }

  const companyTargets = roadmap.targets.filter((t) => t.targetType === 'company');
  const divisionTargets = roadmap.targets.filter((t) => t.targetType === 'division');

  return (
    <div className="min-h-screen bg-zinc-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <h1 className="text-2xl font-semibold mb-2">Your Adaptive Roadmap</h1>
        <p className="text-sm text-slate-400 mb-6">
          Roadmap type: <span className="font-medium text-amber-400">{roadmap.roadmapType}</span>
        </p>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Objective
          </h2>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4 text-sm text-slate-200">
            <pre className="whitespace-pre-wrap break-words text-slate-200 text-xs">
              {JSON.stringify(roadmap.objective ?? {}, null, 2)}
            </pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Target map
          </h2>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4 text-sm text-slate-200 space-y-3">
            {companyTargets.length === 0 && divisionTargets.length === 0 && (
              <p className="text-slate-400 text-sm">No targets defined yet.</p>
            )}
            {companyTargets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">Companies</p>
                <ul className="space-y-1">
                  {companyTargets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span>
                        {t.company?.name ?? t.name}
                        {t.stage ? <span className="text-slate-500"> · {t.stage}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {divisionTargets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">Divisions</p>
                <ul className="space-y-1">
                  {divisionTargets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span>
                        {t.companyDepartment?.customName ??
                          t.companyDepartment?.type?.replace(/_/g, ' ') ??
                          t.name}
                        {t.company?.name ? (
                          <span className="text-slate-500"> · {t.company.name}</span>
                        ) : null}
                        {t.stage ? <span className="text-slate-500"> · {t.stage}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Signal configuration
          </h2>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4 text-sm text-slate-200">
            {roadmap.signalRules.length === 0 ? (
              <p className="text-slate-400 text-sm">No signal rules defined yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.signalRules.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.name}</span>{' '}
                    <span className="text-slate-500">({r.category})</span>
                    {r.description && (
                      <div className="text-slate-400 mt-0.5">{r.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Action playbook
          </h2>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4 text-sm text-slate-200">
            {roadmap.actionMappings.length === 0 ? (
              <p className="text-slate-400 text-sm">No action mappings defined yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.actionMappings.map((m) => (
                  <li key={m.id}>
                    <span className="font-medium">{m.actionType}</span>
                    {m.signalCategory && (
                      <span className="text-slate-500"> · {m.signalCategory}</span>
                    )}
                    <span className="text-slate-500">
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Content strategy
          </h2>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4 text-sm text-slate-200">
            <pre className="whitespace-pre-wrap break-words text-slate-200 text-xs">
              {JSON.stringify(roadmap.contentStrategy ?? {}, null, 2)}
            </pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Conditions &amp; modifiers
          </h2>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4 text-sm text-slate-200">
            {roadmap.conditions.length === 0 ? (
              <p className="text-slate-400 text-sm">No conditions configured.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {roadmap.conditions.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.type}</span>{' '}
                    <span className="text-slate-500">
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

