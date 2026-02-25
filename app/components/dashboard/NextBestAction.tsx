import Link from 'next/link';
import type { NextBestActionItem } from '@/lib/dashboard';

type NextBestActionProps = { actions: NextBestActionItem[] };

export function NextBestAction({ actions }: NextBestActionProps) {
  const top = actions[0];
  const rest = actions.slice(1, 3);

  return (
    <section className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Next best action
      </h2>
      {!top ? null : (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-200">{top.label}</p>
            <Link
              href={top.ctaHref}
              className="mt-2 inline-flex items-center rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
            >
              {top.ctaLabel}
            </Link>
          </div>
          {rest.map((a) => (
            <div key={`${a.companyId}-${a.departmentId}-${a.ctaLabel}`}>
              <p className="text-xs text-slate-400">{a.label}</p>
              <Link
                href={a.ctaHref}
                className="mt-1 inline-block text-xs text-amber-400 hover:text-amber-300"
              >
                {a.ctaLabel} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
