'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StructuredPageExtraction } from '@/lib/content-library/structured-extraction';

type Props = {
  id: string;
  title: string;
  sourceUrl: string | null;
  updatedAt?: Date;
  isPinned?: boolean;
  version?: string | null;
  hasPreviousContent?: boolean;
  userConfirmed?: boolean;
  content?: Record<string, unknown> | null;
};

function getDaysAgo(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatUpdatedBadge(updatedAt: Date): string | null {
  const daysAgo = getDaysAgo(updatedAt);
  if (daysAgo <= 7) {
    if (daysAgo === 0) return 'Updated today';
    if (daysAgo === 1) return 'Updated yesterday';
    return `Updated ${daysAgo} days ago`;
  }
  return null;
}

export function ContentLibraryItemRow({ id, title, sourceUrl, updatedAt, isPinned = false, version, hasPreviousContent = false, userConfirmed = true, content }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [scheduleFrequency, setScheduleFrequency] = useState<'off' | 'daily' | 'weekly'>('off');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmCard, setShowConfirmCard] = useState(false);
  const extraction = content?.extraction as StructuredPageExtraction | undefined;
  const needsConfirmation = !userConfirmed && extraction;

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

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (pinning) return;
    setPinning(true);
    const newPinned = !pinned;
    try {
      const res = await fetch(`/api/content-library/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Pin update failed');
      }
      setPinned(newPinned);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Pin update failed');
    } finally {
      setPinning(false);
    }
  };

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/content-library/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userConfirmed: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Confirm failed');
      }
      setShowConfirmCard(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  };

  const updatedBadge = updatedAt ? formatUpdatedBadge(updatedAt) : null;
  const canViewChanges = hasPreviousContent && version && parseFloat(version) > 1.0;

  return (
    <li className="space-y-2">
      {needsConfirmation && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
          {!showConfirmCard ? (
            <button
              type="button"
              onClick={() => setShowConfirmCard(true)}
              className="text-amber-800 dark:text-amber-200 hover:underline font-medium"
            >
              Review extraction and confirm
            </button>
          ) : (
            <>
              <div className="mb-3 font-medium text-amber-900 dark:text-amber-100">What we found — confirm or edit later</div>
              {extraction.valuePropositions?.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Value propositions: </span>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">{extraction.valuePropositions.slice(0, 3).map((v, i) => <li key={i}>{v}</li>)}</ul>
                </div>
              )}
              {extraction.capabilities?.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Capabilities: </span>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">{extraction.capabilities.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {extraction.proofPoints?.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Proof points: </span>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">{extraction.proofPoints.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {confirming ? '…' : 'Looks good'}
                </button>
                <button type="button" onClick={() => setShowConfirmCard(false)} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm">
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm group flex-wrap">
      <Link
        href={`/dashboard/content-library/${id}/edit`}
        className="text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        title="Edit"
      >
        Edit
      </Link>
      {canViewChanges && (
        <Link
          href={`/dashboard/content-library/${id}/changes`}
          className="text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          title="View changes"
        >
          Changes
        </Link>
      )}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline truncate"
          >
            {title}
          </a>
        ) : (
          <span className="text-gray-900 dark:text-gray-100 truncate">{title}</span>
        )}
        {updatedBadge && (
          <span
            className="shrink-0 px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            title={updatedAt ? `Last updated: ${updatedAt.toLocaleDateString()}` : undefined}
          >
            {updatedBadge}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleTogglePin}
        disabled={pinning}
        className={`shrink-0 p-1 rounded disabled:opacity-50 ${
          pinned
            ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
            : 'text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400'
        }`}
        title={pinned ? 'Unpin' : 'Pin to top'}
        aria-label={pinned ? 'Unpin' : 'Pin to top'}
      >
        {pinning ? (
          <span className="text-xs">…</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={pinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
        )}
      </button>
      {canViewChanges && (
        <Link
          href={`/dashboard/content-library/${id}/changes`}
          className="shrink-0 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
          title="View changes"
        >
          View changes
        </Link>
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
      </div>
    </li>
  );
}
