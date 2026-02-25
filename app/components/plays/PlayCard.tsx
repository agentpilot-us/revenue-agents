'use client';

import { useState } from 'react';
import type { SuggestedPlay } from '@/lib/plays/engine';

type RunResult = {
  previewUrl: string;
  email: { subject: string; body: string };
};

type CardState = 'idle' | 'confirm' | 'running' | 'done';

export function PlayCard({
  suggestion,
  companyId,
}: {
  suggestion: SuggestedPlay;
  companyId: string;
}) {
  const [state, setState] = useState<CardState>('idle');
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPlay() {
    setError(null);
    setState('running');
    try {
      const res = await fetch(`/api/companies/${companyId}/plays/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playId: suggestion.play.id,
          context: suggestion.context,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to run play');
        setState('confirm');
        return;
      }
      setResult({
        previewUrl: data.previewUrl ?? '/go/' + data.slug,
        email: data.email ?? { subject: '', body: '' },
      });
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setState('confirm');
    }
  }

  if (state === 'done' && result) {
    const previewFullUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${result.previewUrl}` : result.previewUrl;
    return (
      <div className="border border-green-800 bg-green-950/30 dark:bg-green-950/30 rounded-lg p-4 w-80">
        <p className="text-sm font-medium text-green-400 mb-2">
          {suggestion.play.icon} {suggestion.play.name} — ready
        </p>
        <a
          href={previewFullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 dark:text-blue-300 underline block mb-3"
        >
          Preview sales page →
        </a>
        <div className="bg-zinc-900 dark:bg-zinc-800 rounded p-3 text-xs text-zinc-300">
          <p className="font-medium mb-1">Draft email:</p>
          <p className="text-zinc-400 dark:text-zinc-500 mb-1">{result.email.subject}</p>
          <p className="whitespace-pre-wrap">{result.email.body}</p>
        </div>
      </div>
    );
  }

  if (state === 'confirm' || state === 'running') {
    return (
      <div className="border border-zinc-700 dark:border-zinc-600 bg-zinc-900 dark:bg-zinc-800/50 rounded-lg p-4 w-80">
        <p className="text-sm font-medium text-white mb-1">
          {suggestion.play.icon} {suggestion.play.name}
        </p>
        <p className="text-xs text-zinc-400 mb-3">
          Building sales page + email draft for <strong>{suggestion.segment.name}</strong> segment.
          Ready to go?
        </p>
        {error && (
          <p className="text-xs text-red-400 dark:text-red-300 mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={runPlay}
            disabled={state === 'running'}
            className="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {state === 'running' ? 'Building…' : 'Build it'}
          </button>
          <button
            onClick={() => setState('idle')}
            disabled={state === 'running'}
            className="text-xs text-zinc-500 px-3 py-2 rounded hover:text-zinc-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-800/50 rounded-lg p-4 w-72 hover:border-zinc-600 dark:hover:border-zinc-600 transition-colors">
      <p className="text-sm font-medium text-white mb-1">
        {suggestion.play.icon} {suggestion.play.name}
      </p>
      <p className="text-xs text-zinc-400 mb-3">{suggestion.triggerText}</p>
      <button
        onClick={() => setState('confirm')}
        className="w-full bg-zinc-800 dark:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded hover:bg-zinc-700 dark:hover:bg-zinc-600"
      >
        Run play →
      </button>
    </div>
  );
}
