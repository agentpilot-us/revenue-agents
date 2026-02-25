'use client';

import { useEffect, useState } from 'react';
import type { SuggestedPlay } from '@/lib/plays/engine';
import { PlayCard } from './PlayCard';

export function PlaySuggestions({ companyId }: { companyId: string }) {
  const [suggestions, setSuggestions] = useState<SuggestedPlay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${companyId}/plays`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
        Suggested plays
      </p>
      <div className="flex gap-3 flex-wrap">
        {suggestions.map((s) => (
          <PlayCard
            key={`${s.play.id}-${s.segment.id}`}
            suggestion={s}
            companyId={companyId}
          />
        ))}
      </div>
    </div>
  );
}
