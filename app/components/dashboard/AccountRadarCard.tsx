import Link from 'next/link';

type Dept = {
  id: string;
  name: string;
  contactCount: number;
  hasCampaign: boolean;
};

type AccountRadarCardProps = {
  id: string;
  name: string;
  pagesLive: number;
  lastActivity: Date | string;
  coveragePct: number;
  borderColor: 'green' | 'amber' | 'gray' | 'red';
  departments: Dept[];
};

function formatLastSignal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

const borderClasses = {
  green: 'border-emerald-500/50',
  amber: 'border-amber-500/50',
  gray: 'border-slate-600',
  red: 'border-red-500/50',
};

export function AccountRadarCard({
  id,
  name,
  pagesLive,
  lastActivity,
  coveragePct,
  borderColor,
  departments,
}: AccountRadarCardProps) {
  return (
    <Link
      href={`/dashboard/companies/${id}`}
      className={`block rounded-lg border bg-zinc-800/80 p-4 transition-colors hover:bg-zinc-800 ${borderClasses[borderColor]}`}
    >
      <span className="font-semibold text-slate-100">{name}</span>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500/80"
          style={{ width: `${coveragePct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1">
        {coveragePct}% covered
      </p>
      <ul className="mt-3 space-y-1.5">
        {departments.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between text-xs text-slate-400"
          >
            <span className="truncate">{d.name}</span>
            <span className="flex items-center gap-1 shrink-0 ml-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    i < (d.contactCount > 0 ? Math.min(d.contactCount, 5) : 0)
                      ? 'text-amber-400'
                      : 'text-slate-600'
                  }
                  aria-hidden
                >
                  {i < (d.contactCount > 0 ? Math.min(d.contactCount, 5) : 0)
                    ? '●'
                    : '○'}
                </span>
              ))}
              <span className="tabular-nums text-slate-500">{d.contactCount}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 mt-3">
        {pagesLive === 0 ? '0 pages' : `${pagesLive} page${pagesLive !== 1 ? 's' : ''} live`}
      </p>
      <p className="text-xs text-slate-500">Last signal: {formatLastSignal(lastActivity)}</p>
      <span className="mt-3 inline-block text-xs font-medium text-amber-400">
        Open account →
      </span>
    </Link>
  );
}
