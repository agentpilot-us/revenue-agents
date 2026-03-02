import type { MomentumWeekComparison } from '@/lib/dashboard';
import { dash } from '@/app/dashboard/dashboard-classes';

type MomentumThisWeekProps = { momentum: MomentumWeekComparison };

function delta(current: number, last: number): string {
  if (last === 0 && current === 0) return '';
  if (last === 0) return `↑ from 0 last week`;
  const d = current - last;
  if (d > 0) return `↑ from ${last} last week`;
  if (d < 0) return `↓ from ${last} last week`;
  return 'same as last week';
}

export function MomentumThisWeek({ momentum }: MomentumThisWeekProps) {
  const { thisWeek, lastWeek } = momentum;

  const rows = [
    { label: 'Contacts found', value: thisWeek.contactsFound, prev: lastWeek.contactsFound },
    { label: 'Emails sent', value: thisWeek.emailsSent, prev: lastWeek.emailsSent },
    { label: 'Page views', value: thisWeek.pageViews, prev: lastWeek.pageViews },
    { label: 'Replies', value: thisWeek.replies, prev: lastWeek.replies },
  ];

  return (
    <section className={dash.cardTight}>
      <h2 className={`${dash.sectionTitle} mb-3`}>This Week</h2>

      <div className="space-y-0">
        {rows.map((r, i) => (
          <div key={r.label} className={dash.momentumRow}>
            <span className={dash.momentumLabel}>{r.label}</span>
            <div className="text-right">
              <span className={dash.momentumValue}>{r.value}</span>
              {delta(r.value, r.prev) && (
                <div className={dash.momentumSub}>{delta(r.value, r.prev)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
