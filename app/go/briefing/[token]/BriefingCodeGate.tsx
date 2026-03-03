'use client';

import { useState, useCallback } from 'react';

export function BriefingCodeGate({ token }: { token: string }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const res = await fetch(`/api/briefing/${token}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        });

        if (res.ok) {
          window.location.reload();
          return;
        }

        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Verification failed');
      } catch {
        setError('Network error — please try again');
      } finally {
        setLoading(false);
      }
    },
    [code, token],
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-center">
          Enter Access Code
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
          This briefing is protected. Enter the code that was included in your email.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A3K9X2"
            maxLength={8}
            autoFocus
            className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.trim().length === 0}
            className="w-full py-3 rounded-lg bg-amber-500 text-zinc-900 font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying…' : 'View Briefing'}
          </button>
        </form>
      </div>
    </div>
  );
}
