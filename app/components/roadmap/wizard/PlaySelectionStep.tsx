'use client';

import { useState, useEffect, useCallback } from 'react';

type Recommendation = {
  playTemplateId: string;
  name: string;
  description: string | null;
  score: number;
  reasons: string[];
  alreadyActivated: boolean;
};

type Props = {
  roadmapId: string;
  onComplete: () => void;
};

export function PlaySelectionStep({ roadmapId, onComplete }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const fetchRecs = useCallback(() => {
    fetch(`/api/roadmap/account-play-activations/recommend?roadmapId=${roadmapId}`)
      .then((r) => r.json())
      .then((d) => setRecommendations(d.recommendations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roadmapId]);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  const handleActivate = async (playTemplateId: string) => {
    setActivatingId(playTemplateId);
    try {
      await fetch('/api/roadmap/account-play-activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId, playTemplateId }),
      });
      setRecommendations((prev) =>
        prev.map((r) => (r.playTemplateId === playTemplateId ? { ...r, alreadyActivated: true } : r))
      );
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse">Analyzing account...</p>;

  const activatedCount = recommendations.filter((r) => r.alreadyActivated).length;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Recommended plays based on this account&apos;s profile. Click to activate.
      </p>

      {recommendations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No recommendations found. Add more account data in previous steps.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {recommendations.map((rec) => (
            <div
              key={rec.playTemplateId}
              className={`flex items-center justify-between rounded-lg border p-2.5 transition-colors ${
                rec.alreadyActivated
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-border bg-card/40 hover:border-blue-500/30'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{rec.name}</span>
                  {rec.score > 0 && (
                    <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">
                      {rec.score}pt
                    </span>
                  )}
                </div>
                {rec.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rec.reasons.map((r, i) => (
                      <span key={i} className="text-[9px] text-emerald-400/80">{r}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 ml-2">
                {rec.alreadyActivated ? (
                  <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                ) : (
                  <button
                    type="button"
                    disabled={activatingId === rec.playTemplateId}
                    onClick={() => handleActivate(rec.playTemplateId)}
                    className="text-[10px] font-medium bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {activatingId === rec.playTemplateId ? '...' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onComplete}
        className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        {activatedCount > 0 ? `Continue (${activatedCount} activated)` : 'Skip & Continue'}
      </button>
    </div>
  );
}
