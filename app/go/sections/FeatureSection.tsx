'use client';

type Props = {
  title: string;
  description: string;
  bulletPoints: string[];
};

export function FeatureSection({ title, description, bulletPoints }: Props) {
  return (
    <section className="py-2">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {title}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">{description}</p>
        {bulletPoints.length > 0 && (
          <ul className="space-y-2">
            {bulletPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
