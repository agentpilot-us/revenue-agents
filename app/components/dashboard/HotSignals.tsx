import Link from 'next/link';
import type { HotSignal } from '@/lib/dashboard';

type HotSignalsProps = { signals: HotSignal[] };

const colorClasses = {
  red: 'border-red-500/50 bg-red-500/5',
  amber: 'border-amber-500/50 bg-amber-500/5',
  green: 'border-emerald-500/50 bg-emerald-500/5',
};

const dotClasses = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
};

export function HotSignals({ signals }: HotSignalsProps) {
  return (
    <section className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Hot signals
      </h2>
      {signals.length === 0 ? (
        <p className="text-sm text-slate-500">No signals in the last 48 hours.</p>
      ) : (
        <ul className="space-y-2">
          {signals.slice(0, 5).map((s) => (
            <li
              key={`${s.companyId}-${s.date}-${s.headline}`}
              className={`rounded-md border p-2 ${colorClasses[s.color]}`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClasses[s.color]}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{s.headline}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                  {s.companyName && (
                    <p className="text-xs text-slate-400 mt-0.5">{s.companyName}</p>
                  )}
                  <Link
                    href={s.ctaHref}
                    className="mt-2 inline-block text-xs font-medium text-amber-400 hover:text-amber-300"
                  >
                    {s.ctaLabel} →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
