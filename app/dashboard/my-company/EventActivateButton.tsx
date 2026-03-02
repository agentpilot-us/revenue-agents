'use client';

import { useState } from 'react';

type Props = {
  eventName: string;
};

export function EventActivateButton({ eventName }: Props) {
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (activated || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/my-company/events/${encodeURIComponent(eventName)}/activate`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to activate trigger.');
        return;
      }
      setActivated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to activate trigger.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || activated}
        className="text-[11px] font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground"
      >
        {activated ? 'Activated' : loading ? 'Activating…' : 'Activate trigger'}
      </button>
      {error && (
        <span className="text-[10px] text-amber-500 truncate max-w-[160px]">
          {error}
        </span>
      )}
    </div>
  );
}

