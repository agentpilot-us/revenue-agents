'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveImportedContent,
  type GetCompanySetupStateImport,
  type ApprovedItem,
} from '@/app/actions/content-library-setup';

type Props = {
  importJob: GetCompanySetupStateImport;
};

type CategorizedPayload = { items: ApprovedItem[] };

function getItems(importJob: GetCompanySetupStateImport): ApprovedItem[] {
  const raw = importJob.categorizedContent;
  if (!raw || typeof raw !== 'object') return [];
  const payload = raw as CategorizedPayload;
  return Array.isArray(payload.items) ? payload.items : [];
}

export function ReviewImportedContent({ importJob }: Props) {
  const router = useRouter();
  const items = useMemo(() => getItems(importJob), [importJob.categorizedContent]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((_, i) => i)));
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(items.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  const handleApprove = async () => {
    const approved = items.filter((_, i) => selected.has(i));
    if (approved.length === 0) {
      setError('Select at least one item to approve.');
      return;
    }
    setError(null);
    setApproving(true);
    try {
      const res = await approveImportedContent(importJob.id, approved);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setApproving(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Review imported content
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            No categorized items to review. You can go back and run a new import.
          </p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-4 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Review imported content
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Select the items to add to your company data. Unselected items will be skipped.
        </p>
        {error && (
          <p className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Deselect all
          </button>
          <span className="py-2 text-sm text-gray-500 dark:text-gray-400">
            {selected.size} of {items.length} selected
          </span>
        </div>

        <ul className="space-y-3 mb-6">
          {items.map((item, index) => (
            <li
              key={`${item.url}-${index}`}
              className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggle(index)}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-blue-600"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.title || item.url}
                </h3>
                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                    {item.suggestedType}
                  </span>
                  {item.industry && (
                    <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {item.industry}
                    </span>
                  )}
                  {item.department && (
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {item.department}
                    </span>
                  )}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block truncate max-w-full"
                >
                  {item.url}
                </a>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleApprove}
          disabled={approving || selected.size === 0}
          className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium disabled:opacity-50 disabled:pointer-events-none"
        >
          {approving ? 'Adding…' : `Approve selected (${selected.size})`}
        </button>
      </div>
    </div>
  );
}
