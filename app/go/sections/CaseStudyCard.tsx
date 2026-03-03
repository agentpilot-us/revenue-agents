'use client';

type Props = {
  company: string;
  result: string;
  quote?: string;
};

export function CaseStudyCard({ company, result, quote }: Props) {
  return (
    <section className="py-2">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800/60 dark:to-zinc-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <span className="text-amber-500 text-lg font-bold">{company.charAt(0)}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Case Study
            </p>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{company}</h3>
          </div>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3">
          {result}
        </p>
        {quote && (
          <blockquote className="border-l-2 border-amber-500 pl-4 mt-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300 italic">{quote}</p>
          </blockquote>
        )}
      </div>
    </section>
  );
}
