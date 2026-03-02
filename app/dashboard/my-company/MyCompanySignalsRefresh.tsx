'use client';

import { useState } from 'react';

export function MyCompanySignalsRefresh() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ created: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch('/api/my-company/signals/refresh', {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to refresh signals.');
        return;
      }
      const data = await res.json();
      setLastResult({ created: data.created ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh signals.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
      >
        {loading ? 'Refreshing…' : 'Refresh My Company signals'}
      </button>
      {lastResult && (
        <span className="text-[11px] text-muted-foreground">
          Added {lastResult.created} new signal
          {lastResult.created === 1 ? '' : 's'}.
        </span>
      )}
      {error && (
        <span className="text-[11px] text-amber-500 truncate max-w-[220px]">
          {error}
        </span>
      )}
    </div>
  );
}

