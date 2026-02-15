'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getImportProgress,
  cancelContentImport,
  type GetCompanySetupStateImport,
} from '@/app/actions/content-library-setup';

type Props = {
  importJob: GetCompanySetupStateImport;
};

const STEP_LABELS: Record<string, string> = {
  PENDING: 'Starting…',
  DISCOVERING: 'Discovering pages…',
  SCRAPING: 'Scraping content…',
  CATEGORIZING: 'Categorizing with AI…',
  REVIEW_PENDING: 'Ready for review',
  APPROVED: 'Complete',
  FAILED: 'Import failed',
};

export function ImportProgress({ importJob }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<{
    status: string;
    progress: number;
    totalPages: number;
    scrapedPages: number;
    categorizedPages: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    const MAX_POLLS = 300; // ~10 minutes at 2s intervals
    let intervalId: ReturnType<typeof setInterval>;

    const poll = async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
        if (!cancelled) {
          setError('Import is taking too long. Please try again or contact support.');
          clearInterval(intervalId);
        }
        return;
      }

      const res = await getImportProgress(importJob.id);
      if (cancelled) return;

      if (!res.ok) {
        if (!cancelled) setError(res.error);
        return;
      }

      if (!cancelled) {
        setProgress({
          status: res.status,
          progress: res.progress,
          totalPages: res.totalPages,
          scrapedPages: res.scrapedPages,
          categorizedPages: res.categorizedPages,
        });
      }
      if (cancelled) return;

      if (res.status === 'REVIEW_PENDING' || ['APPROVED', 'FAILED'].includes(res.status)) {
        router.refresh();
        return;
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [importJob.id, router]);

  const display = progress ?? {
    status: importJob.status,
    progress: 0,
    totalPages: importJob.totalPages,
    scrapedPages: importJob.scrapedPages,
    categorizedPages: importJob.categorizedPages,
  };
  const isFailed = display.status === 'FAILED';
  const importErrors = importJob.errors as { step?: string; error?: string } | null;
  const inProgress = ['PENDING', 'DISCOVERING', 'SCRAPING', 'CATEGORIZING'].includes(display.status);

  const handleStop = async () => {
    setStopping(true);
    setError(null);
    const res = await cancelContentImport(importJob.id);
    if (!res.ok) {
      setError(res.error);
      setStopping(false);
      return;
    }
    setStopping(false);
    router.refresh();
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Smart import in progress
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Importing from {importJob.sourceUrl}. This may take a minute or two.
        </p>
        {error && (
          <p className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </p>
        )}
        {isFailed && importErrors?.error && (
          <p className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
            {importErrors.error}
          </p>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-6 space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                {STEP_LABELS[display.status] ?? display.status}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {display.progress}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${display.progress}%` }}
              />
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className={['DISCOVERING', 'SCRAPING', 'CATEGORIZING', 'REVIEW_PENDING', 'APPROVED'].includes(display.status) ? 'text-blue-600 dark:text-blue-400' : ''}>
              ✓ Discovering pages
            </li>
            <li className={['SCRAPING', 'CATEGORIZING', 'REVIEW_PENDING', 'APPROVED'].includes(display.status) ? 'text-blue-600 dark:text-blue-400' : ''}>
              ✓ Scraping content {display.totalPages > 0 && `(${display.scrapedPages}/${display.totalPages})`}
            </li>
            <li className={['CATEGORIZING', 'REVIEW_PENDING', 'APPROVED'].includes(display.status) ? 'text-blue-600 dark:text-blue-400' : ''}>
              ✓ Categorizing {display.totalPages > 0 && `(${display.categorizedPages} done)`}
            </li>
            <li className={['REVIEW_PENDING', 'APPROVED'].includes(display.status) ? 'text-blue-600 dark:text-blue-400' : ''}>
              {display.status === 'REVIEW_PENDING' ? '→ Ready for review' : '✓ Complete'}
            </li>
          </ul>
          {inProgress && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStop}
                disabled={stopping}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 font-medium text-sm"
              >
                {stopping ? 'Stopping…' : 'Stop import'}
              </button>
              <Link
                href="/dashboard/content-library"
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 font-medium text-sm"
              >
                Back to Content Library
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
