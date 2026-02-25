import Link from 'next/link';
import type { NextBestActionItem } from '@/lib/dashboard';

type LaunchPlaysProps = { actions: NextBestActionItem[] };

export function LaunchPlays({ actions }: LaunchPlaysProps) {
  const top = actions.filter((a) => a.playId).slice(0, 2);
  return (
    <section className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Launch
      </h2>
      <p className="text-xs text-slate-500 mb-2">Recommended for right now</p>
      {top.length === 0 ? (
        <Link
          href="/chat?play=expansion"
          className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-zinc-700/80 hover:border-amber-500/50"
        >
          Account Expansion
        </Link>
      ) : (
        <ul className="space-y-2">
          {top.map((a) => (
            <li key={`${a.companyId}-${a.departmentId}-${a.playId}`}>
              <p className="text-sm text-slate-200">{a.label}</p>
              <Link
                href={a.ctaHref}
                className="text-xs font-medium text-amber-400 hover:text-amber-300"
              >
                Run play →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
