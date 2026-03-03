'use client';

type Props = {
  name: string;
  date: string;
  location: string;
  description: string;
  registerUrl: string;
};

export function EventSection({ name, date, location, description, registerUrl }: Props) {
  return (
    <section className="py-2">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-900/10 dark:to-zinc-800/50 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {name}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              {[date, location].filter(Boolean).join(' · ')}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              {description}
            </p>
            <a
              href={registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2 text-sm transition-colors"
            >
              Register Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
