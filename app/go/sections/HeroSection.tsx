'use client';

type Props = {
  headline: string;
  body: string;
  backgroundContext?: string;
  companyName?: string;
  logoUrl?: string;
};

export function HeroSection({ headline, body, backgroundContext, companyName, logoUrl }: Props) {
  return (
    <section className="relative px-8 pt-12 pb-10 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      <div className="relative z-10 max-w-2xl">
        {(logoUrl || companyName) && (
          <div className="mb-6 flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={companyName ?? ''}
                className="h-8 w-auto object-contain brightness-0 invert"
              />
            )}
            {companyName && (
              <span className="text-sm font-medium text-zinc-400">{companyName}</span>
            )}
          </div>
        )}
        {backgroundContext && (
          <p className="text-sm text-amber-400/80 font-medium mb-3 tracking-wide uppercase">
            {backgroundContext}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
          {headline}
        </h1>
        <p className="text-lg text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {body}
        </p>
      </div>
    </section>
  );
}
