import type { MomentumWeekComparison } from '@/lib/dashboard';

type MomentumThisWeekProps = { momentum: MomentumWeekComparison };

function delta(current: number, last: number): string {
  if (last === 0 && current === 0) return '';
  if (last === 0) return '↑ from 0 last week';
  const d = current - last;
  if (d > 0) return `↑ from ${last} last week`;
  if (d < 0) return `↓ from ${last} last week`;
  return `same as last week`;
}

export function MomentumThisWeek({ momentum }: MomentumThisWeekProps) {
  const { thisWeek, lastWeek } = momentum;
  return (
    <section className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        This week
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-400">Contacts found</span>
          <span className="tabular-nums font-medium text-slate-100">
            {thisWeek.contactsFound}
            {delta(thisWeek.contactsFound, lastWeek.contactsFound) && (
              <span className="ml-1 text-xs text-slate-500">
                {delta(thisWeek.contactsFound, lastWeek.contactsFound)}
              </span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-400">Emails sent</span>
          <span className="tabular-nums font-medium text-slate-100">
            {thisWeek.emailsSent}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-400">Page views</span>
          <span className="tabular-nums font-medium text-slate-100">
            {thisWeek.pageViews}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-slate-400">Replies</span>
          <span className="tabular-nums font-medium text-slate-100">
            {thisWeek.replies}
          </span>
        </div>
      </div>
    </section>
  );
}
