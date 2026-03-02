'use client';

import { useState } from 'react';
import { seedRoadmapConfigForCurrentUser } from '@/app/actions/roadmap';

type Props = {
  hasNoSignalRules: boolean;
  /** When true (e.g. no roadmap yet), show a create-first label */
  emptyState?: boolean;
};

export function SeedRoadmapConfigButton({ hasNoSignalRules, emptyState }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasNoSignalRules) return null;

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    const result = await seedRoadmapConfigForCurrentUser();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.reload();
  };

  const label = emptyState
    ? 'Create roadmap with example configuration'
    : 'Load example configuration';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleSeed}
        disabled={loading}
        className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {loading ? 'Loading…' : label}
      </button>
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  );
}
