'use client';

import { useCallback } from 'react';
import type { SalesPageSection } from '@/types/sales-page';

type Props = {
  companyName: string;
  logoUrl?: string;
  headline: string | null;
  subheadline: string | null;
  sections: SalesPageSection[];
  ctaLabel: string | null;
  ctaUrl: string | null;
  campaignId: string;
  visitId?: string | null;
  onTrackCtaClick?: () => void;
};

export function StaticSalesPage({
  companyName,
  logoUrl,
  headline,
  subheadline,
  sections,
  ctaLabel,
  ctaUrl,
  campaignId,
  visitId,
  onTrackCtaClick,
}: Props) {
  const handleCtaClick = useCallback(() => {
    onTrackCtaClick?.();
    if (visitId) {
      fetch(`/api/go/${campaignId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'cta_click', visitId }),
      }).catch(() => {});
    }
  }, [campaignId, visitId, onTrackCtaClick]);

  const ctaHref = ctaUrl || '#';

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
      {(logoUrl || companyName) && (
        <div className="mb-4 flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-8 w-auto object-contain"
            />
          )}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{companyName}</p>
        </div>
      )}
      {headline && (
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {headline}
        </h1>
      )}
      {subheadline && (
        <p className="text-zinc-600 dark:text-zinc-300 mb-6">{subheadline}</p>
      )}
      <div className="space-y-8">
        {sections.map((section, i) => (
          <SectionBlock key={i} section={section} campaignId={campaignId} visitId={visitId} />
        ))}
      </div>
      {(ctaLabel || ctaUrl) && (
        <div className="pt-6">
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCtaClick}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2.5 transition-colors"
          >
            {ctaLabel || 'Learn more'}
          </a>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  campaignId,
  visitId,
}: {
  section: SalesPageSection;
  campaignId: string;
  visitId?: string | null;
}) {
  switch (section.type) {
    case 'hero':
      return (
        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {section.headline}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
            {section.body}
          </p>
        </section>
      );
    case 'value_props':
      return (
        <section>
          <ul className="space-y-4">
            {section.items.map((item, i) => (
              <li key={i}>
                {item.icon && (
                  <span className="text-amber-500 mr-2" aria-hidden>
                    {item.icon}
                  </span>
                )}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </span>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      );
    case 'feature':
      return (
        <section>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {section.title}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-300 mb-3">{section.description}</p>
          {section.bulletPoints?.length > 0 && (
            <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
              {section.bulletPoints.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      );
    case 'event':
      return (
        <section className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {section.name}
          </h2>
          {(section.date || section.location) && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
              {[section.date, section.location].filter(Boolean).join(' · ')}
            </p>
          )}
          {section.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
              {section.description}
            </p>
          )}
          {section.registerUrl && (
            <a
              href={section.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Register now
            </a>
          )}
        </section>
      );
    case 'case_study':
      return (
        <section className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {section.company}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{section.result}</p>
          {section.quote && (
            <blockquote className="mt-2 text-sm text-zinc-700 dark:text-zinc-200 border-l-2 border-amber-500 pl-3 italic">
              {section.quote}
            </blockquote>
          )}
        </section>
      );
    case 'social_proof':
      return (
        <section>
          <div className="space-y-4">
            {section.quotes.map((q, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-amber-500 pl-3 text-zinc-700 dark:text-zinc-200"
              >
                <p className="text-sm">{q.text}</p>
                <cite className="text-xs text-zinc-500 dark:text-zinc-400 not-italic">
                  — {q.author}
                  {q.title ? `, ${q.title}` : ''}
                </cite>
              </blockquote>
            ))}
          </div>
        </section>
      );
    case 'cta':
      return (
        <section className="pt-2">
          <p className="text-zinc-700 dark:text-zinc-200 font-medium mb-3">
            {section.headline}
          </p>
          <a
            href={section.buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2.5 transition-colors"
          >
            {section.buttonLabel}
          </a>
        </section>
      );
    default:
      return null;
  }
}
