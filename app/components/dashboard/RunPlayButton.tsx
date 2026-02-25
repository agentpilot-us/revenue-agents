'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunPlayButton({
  signalId,
  playLabel,
}: {
  signalId: string;
  playLabel: string;
}) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setState('running');
    setError(null);
    try {
      const res = await fetch(`/api/signals/${signalId}/run-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        setState('idle');
        return;
      }
      setState('done');
      // Redirect to preview page
      if (data.previewUrl) {
        router.push(data.previewUrl);
      }
    } catch {
      setError('Request failed');
      setState('idle');
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={state === 'running'}
        className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
      >
        {state === 'running' ? 'Building…' : playLabel}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
