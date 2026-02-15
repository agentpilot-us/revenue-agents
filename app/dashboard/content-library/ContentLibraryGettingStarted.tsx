'use client';

import { useState } from 'react';
import Link from 'next/link';

export type StepId =
  | 'products'
  | 'industries'
  | 'use-cases'
  | 'case-studies'
  | 'events'
  | 'frameworks';

type Step = {
  id: StepId;
  label: string;
  description: string;
  tab: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

/** Steps that support "Paste URL" inline; param key for query string. */
const PASTE_URL_CONFIG: Partial<Record<StepId, { hrefBase: string; paramKey: string }>> = {
  industries: { hrefBase: '/dashboard/content-library/sync-nvidia?type=industry', paramKey: 'industryUrl' },
  'use-cases': { hrefBase: '/dashboard/content-library/import?type=UseCase', paramKey: 'url' },
  'case-studies': { hrefBase: '/dashboard/content-library/import?type=SuccessStory', paramKey: 'url' },
  events: { hrefBase: '/dashboard/content-library/sync-nvidia?type=gtc', paramKey: 'sessionCatalogUrl' },
  frameworks: { hrefBase: '/dashboard/content-library/import?type=Framework', paramKey: 'url' },
};

type Props = {
  counts: {
    products: number;
    industries: number;
    useCases: number;
    caseStudies: number;
    events: number;
    frameworks: number;
  };
};

const STEPS: Step[] = [
  {
    id: 'products',
    label: 'Product descriptions & pricing',
    description: 'Add your product catalog and pricing so the AI can recommend the right products.',
    tab: 'products',
    primaryAction: { label: 'Go to Products', href: '/dashboard/content-library?tab=products' },
    secondaryAction: { label: 'Upload file', href: '/dashboard/content-library/products/upload' },
  },
  {
    id: 'industries',
    label: 'Industry playbooks',
    description: 'Define use cases and value props by industry (e.g., Automotive, Healthcare).',
    tab: 'industries',
    primaryAction: { label: 'Pull data from URL', href: '/dashboard/content-library/sync-nvidia' },
    secondaryAction: { label: 'Upload file', href: '/dashboard/content-library/industries/upload' },
  },
  {
    id: 'use-cases',
    label: 'Use cases',
    description: 'Add use cases that match the industries you sell to. Import from URL or add manually.',
    tab: 'UseCase',
    primaryAction: { label: 'Import from URL', href: '/dashboard/content-library/import?type=UseCase' },
    secondaryAction: { label: 'Add manually', href: '/dashboard/content-library/import?type=UseCase' },
  },
  {
    id: 'case-studies',
    label: 'Success stories / case studies',
    description: 'Add customer success stories the AI can reference. Import from URL or add manually. You can turn on automatic refresh after importing.',
    tab: 'SuccessStory',
    primaryAction: { label: 'Import from URL', href: '/dashboard/content-library/import?type=SuccessStory' },
    secondaryAction: { label: 'Add manually', href: '/dashboard/content-library/import?type=SuccessStory' },
  },
  {
    id: 'events',
    label: 'Events & sessions',
    description: 'Add events with a name and URL, or scrape GTC/other event sites.',
    tab: 'CompanyEvent',
    primaryAction: { label: 'Add event (name + URL)', href: '/dashboard/content-library/events/add' },
    secondaryAction: { label: 'Scrape site (GTC or events)', href: '/dashboard/content-library/sync-nvidia' },
  },
  {
    id: 'frameworks',
    label: 'Frameworks',
    description: 'Sales frameworks and messaging guides. Import from URL or upload manually.',
    tab: 'Framework',
    primaryAction: { label: 'Import from URL', href: '/dashboard/content-library/import?type=Framework' },
    secondaryAction: { label: 'Template guide', href: '/dashboard/content-library/frameworks/template' },
  },
];

function getCount(stepId: StepId, counts: Props['counts']): number {
  switch (stepId) {
    case 'products':
      return counts.products;
    case 'industries':
      return counts.industries;
    case 'use-cases':
      return counts.useCases;
    case 'case-studies':
      return counts.caseStudies;
    case 'events':
      return counts.events;
    case 'frameworks':
      return counts.frameworks;
    default:
      return 0;
  }
}

export function ContentLibraryGettingStarted({ counts }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [pasteUrlByStep, setPasteUrlByStep] = useState<Partial<Record<StepId, string>>>({});
  const completedCount = STEPS.filter((s) => getCount(s.id, counts) > 0).length;
  const totalSteps = STEPS.length;

  const getPasteUrlHref = (stepId: StepId, url: string): string => {
    const config = PASTE_URL_CONFIG[stepId];
    if (!config || !url.trim()) return config?.hrefBase ?? '#';
    return `${config.hrefBase}&${config.paramKey}=${encodeURIComponent(url.trim())}`;
  };

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-zinc-800/50 overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-100/50 dark:hover:bg-zinc-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-sm font-semibold">
            {completedCount}/{totalSteps}
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Get started with Company setup</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Follow these steps to add content. The AI uses this to personalize outreach and recommend sessions.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              For internal or confidential content (e.g. pricing), use <strong>Upload file</strong> or <strong>Add manually</strong>.
            </p>
          </div>
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-blue-200 dark:border-blue-800 px-5 py-4">
          <ol className="space-y-3">
            {STEPS.map((step, index) => {
              const count = getCount(step.id, counts);
              const isDone = count > 0;
              return (
                <li
                  key={step.id}
                  className={`flex items-start gap-4 rounded-lg p-3 ${
                    isDone ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-white dark:bg-zinc-800/80'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      isDone
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {isDone ? '✓' : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{step.label}</span>
                      {isDone && count > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {count} item{count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{step.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Link href={step.primaryAction.href}>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm rounded border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          {step.primaryAction.label}
                        </button>
                      </Link>
                      {step.secondaryAction && (
                        <Link href={step.secondaryAction.href}>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
                          >
                            {step.secondaryAction.label}
                          </button>
                        </Link>
                      )}
                    </div>
                    {PASTE_URL_CONFIG[step.id] && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <input
                          type="url"
                          placeholder="Paste URL"
                          value={pasteUrlByStep[step.id] ?? ''}
                          onChange={(e) =>
                            setPasteUrlByStep((prev) => ({ ...prev, [step.id]: e.target.value }))
                          }
                          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                        />
                        <Link
                          href={getPasteUrlHref(step.id, pasteUrlByStep[step.id] ?? '')}
                          className="px-3 py-1.5 text-sm rounded border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 whitespace-nowrap"
                        >
                          Go
                        </Link>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
