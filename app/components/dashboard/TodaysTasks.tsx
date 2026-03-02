import Link from 'next/link';
import { dash } from '@/app/dashboard/dashboard-classes';

type Task = { id: string; label: string; href: string };

type TodaysTasksProps = { tasks: Task[] };

export function TodaysTasks({ tasks }: TodaysTasksProps) {
  return (
    <section className={dash.card}>
      <div className={dash.sectionHeader}>
        <h2 className={dash.sectionTitle}>Today&apos;s Tasks</h2>
        {tasks.length > 0 && (
          <span className={dash.sectionSubtitle}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · sorted by impact
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className={dash.emptyStateText}>No tasks due today.</p>
      ) : (
        <div className="rounded-lg border border-[var(--ap-border-default)] overflow-hidden bg-[var(--ap-bg-surface)]">
          {tasks.map((t) => (
            <Link key={t.id} href={t.href} className={dash.taskRow}>
              {/* Checkbox placeholder */}
              <div
                className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-2 border-[var(--ap-border-medium)] flex items-center justify-center"
                aria-hidden
              >
                <span className="text-[10px] text-[var(--ap-text-faint)]">☐</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--ap-text-primary)] leading-snug">
                  {t.label}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
