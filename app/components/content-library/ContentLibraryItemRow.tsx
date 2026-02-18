'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  title: string;
  sourceUrl: string | null;
};

export function ContentLibraryItemRow({ id, title, sourceUrl }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'off' | 'daily' | 'weekly'>('off');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (!sourceUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/content-library/${id}/schedule`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.frequency === 'daily' || data.frequency === 'weekly') setScheduleFrequency(data.frequency);
      } catch {
        if (!cancelled) setScheduleFrequency('off');
      }
    })();
    return () => { cancelled = true; };
  }, [id, sourceUrl]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (deleting) return;
    if (!confirm('Remove this item from your company data?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/content-library/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleScheduleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'off' | 'daily' | 'weekly';
    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/content-library/${id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update schedule');
      }
      setScheduleFrequency(value);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleRefreshNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/content-library/${id}/refresh`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Refresh failed');
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <li className="flex items-center gap-2 text-sm group flex-wrap">
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 min-w-0"
        >
          {title}
        </a>
      ) : (
        <span className="text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">{title}</span>
      )}
      {sourceUrl && (
        <>
          <select
            value={scheduleFrequency}
            onChange={handleScheduleChange}
            disabled={scheduleLoading}
            className="shrink-0 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 py-1 px-2 disabled:opacity-50"
            title="Schedule updates from URL"
            aria-label="Schedule updates"
          >
            <option value="off">Updates: Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="button"
            onClick={handleRefreshNow}
            disabled={refreshing}
            className="shrink-0 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
            title="Refresh now from URL"
          >
            {refreshing ? '…' : 'Refresh now'}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded disabled:opacity-50"
        title="Remove"
        aria-label={`Remove ${title}`}
      >
        {deleting ? (
          <span className="text-xs">…</span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        )}
      </button>
    </li>
  );
}
