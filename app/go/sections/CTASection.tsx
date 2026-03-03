'use client';

type Props = {
  headline: string;
  buttonLabel: string;
  buttonUrl: string;
  urgencyText?: string;
  onCtaClick?: () => void;
};

export function CTASection({ headline, buttonLabel, buttonUrl, urgencyText, onCtaClick }: Props) {
  return (
    <section className="py-4">
      <div className="text-center rounded-xl bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/60 dark:to-zinc-800/30 border border-zinc-200 dark:border-zinc-700/60 p-8">
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {headline}
        </p>
        <a
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onCtaClick}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold px-8 py-3 text-base transition-colors shadow-sm hover:shadow-md"
        >
          {buttonLabel}
        </a>
        {urgencyText && (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{urgencyText}</p>
        )}
      </div>
    </section>
  );
}
