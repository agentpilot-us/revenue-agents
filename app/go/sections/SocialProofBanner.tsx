'use client';

type Metric = {
  value: string;
  label: string;
};

type Quote = {
  text: string;
  author: string;
  title: string;
};

type Props = {
  metrics?: Metric[];
  quotes: Quote[];
};

export function SocialProofBanner({ metrics, quotes }: Props) {
  return (
    <section className="py-2">
      {metrics && metrics.length > 0 && (
        <div className="flex flex-wrap justify-center gap-8 mb-8">
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-amber-500">{m.value}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}
      {quotes.length > 0 && (
        <div className="space-y-5">
          {quotes.map((q, i) => (
            <blockquote
              key={i}
              className="relative rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 p-5"
            >
              <div className="absolute -top-2 left-5 text-3xl text-amber-500/50 font-serif leading-none select-none">&ldquo;</div>
              <p className="text-zinc-700 dark:text-zinc-300 italic leading-relaxed pl-4">
                {q.text}
              </p>
              <cite className="block mt-3 pl-4 text-sm text-zinc-500 dark:text-zinc-400 not-italic font-medium">
                &mdash; {q.author}
                {q.title ? `, ${q.title}` : ''}
              </cite>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}
