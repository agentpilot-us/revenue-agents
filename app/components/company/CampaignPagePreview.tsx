'use client';

export type PageSectionEvent = { title?: string; date?: string; description?: string; url?: string };
export type PageSectionRef = { title?: string; summary?: string; link?: string };
export type PageSections = {
  events?: PageSectionEvent[];
  caseStudy?: PageSectionRef;
  successStory?: PageSectionRef;
};

type Props = {
  companyName: string;
  segmentName: string | null;
  headline: string;
  body: string | null;
  pageSections?: PageSections | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  /** When true, show "This is a preview" banner and chat placeholder instead of real chat. */
  isPreview?: boolean;
};

export function CampaignPagePreview({
  companyName,
  segmentName,
  headline,
  body,
  pageSections,
  ctaLabel,
  ctaUrl,
  isPreview = false,
}: Props) {
  const sections = pageSections ?? null;
  const hasEvents = sections?.events && sections.events.length > 0;
  const hasCaseStudy = sections?.caseStudy && (sections.caseStudy.title || sections.caseStudy.summary);
  const hasSuccessStory = sections?.successStory && (sections.successStory.title || sections.successStory.summary);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {isPreview && (
          <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            This is a preview. Chat will be available after approval.
          </div>
        )}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
          {segmentName && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              {companyName}
              {segmentName ? ` · ${segmentName}` : ''}
            </p>
          )}
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {headline}
          </h1>
          {body && (
            <div
              className="prose prose-zinc dark:prose-invert prose-sm max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          )}
          {hasEvents && (
            <section className="mb-6">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">Upcoming events</h2>
              <ul className="space-y-2">
                {sections!.events!.map((e, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300">
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline">
                        {e.title || 'Event'}
                      </a>
                    ) : (
                      <span className="font-medium">{e.title || 'Event'}</span>
                    )}
                    {e.date && <span className="text-zinc-500 dark:text-zinc-400 ml-2">{e.date}</span>}
                    {e.description && <p className="mt-1 text-zinc-500 dark:text-zinc-400">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {hasCaseStudy && (
            <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Case study</h2>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">{sections!.caseStudy!.title}</p>
              {sections!.caseStudy!.summary && <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{sections!.caseStudy!.summary}</p>}
              {sections!.caseStudy!.link && (
                <a href={sections!.caseStudy!.link} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block">Read more</a>
              )}
            </section>
          )}
          {hasSuccessStory && (
            <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Success story</h2>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">{sections!.successStory!.title}</p>
              {sections!.successStory!.summary && <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{sections!.successStory!.summary}</p>}
              {sections!.successStory!.link && (
                <a href={sections!.successStory!.link} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block">Read more</a>
              )}
            </section>
          )}
          {(ctaLabel || ctaUrl) && (
            <div className="pt-4">
              <a
                href={ctaUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2.5 transition-colors"
              >
                {ctaLabel || 'Learn more'}
              </a>
            </div>
          )}
        </div>

        {isPreview ? (
          <div className="mt-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Chat will be available after approval.
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
          <span>Powered by Agent Pilot</span>
        </div>
      </div>
    </div>
  );
}
