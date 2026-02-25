import Link from 'next/link';

type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: Date | string;
  companyId: string | null;
  companyName: string | null;
  companyDepartmentId: string | null;
  contactId: string | null;
};

type ActivityFeedProps = { activities: ActivityItem[] };

function formatDay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString();
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const byDay = new Map<string, ActivityItem[]>();
  for (const a of activities) {
    const day = formatDay(a.createdAt);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(a);
  }
  const days = Array.from(byDay.entries());

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-700 bg-zinc-800/40">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Activity feed
      </h2>
      {days.length === 0 ? (
        <p className="text-sm text-slate-500">No recent activity.</p>
      ) : (
        <ul className="space-y-4">
          {days.map(([day, items]) => (
            <li key={day}>
              <p className="text-xs font-medium text-slate-500 mb-2">{day}</p>
              <ul className="space-y-1.5">
                {items.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-2 text-sm text-slate-300">
                    <span className="text-slate-500" aria-hidden>
                      ●
                    </span>
                    <span>
                      {a.summary}
                      {a.companyName && (
                        <span className="text-slate-500"> ({a.companyName})</span>
                      )}
                    </span>
                    {(a.type === 'Contact Added' || a.type === 'ContactDiscovered') &&
                      a.companyId && (
                        <>
                          <Link
                            href={`/dashboard/companies/${a.companyId}${a.companyDepartmentId ? `/departments/${a.companyDepartmentId}` : ''}`}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            Draft emails →
                          </Link>
                          <Link
                            href={`/chat?play=expansion&accountId=${a.companyId}&segmentId=${a.companyDepartmentId ?? ''}`}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            Run event invite play →
                          </Link>
                        </>
                      )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
