import Link from 'next/link';

type Task = { id: string; label: string; href: string };

type TodaysTasksProps = { tasks: Task[] };

export function TodaysTasks({ tasks }: TodaysTasksProps) {
  return (
    <section className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Today&apos;s tasks
      </h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">No tasks due today.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
              >
                <span className="text-slate-500" aria-hidden>
                  [ ]
                </span>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
