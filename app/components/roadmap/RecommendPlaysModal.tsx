'use client';

import { useState, useEffect } from 'react';

type Recommendation = {
  playTemplateId: string;
  name: string;
  description: string | null;
  triggerType: string;
  score: number;
  reasons: string[];
  alreadyActivated: boolean;
};

type Props = {
  roadmapId: string;
  onActivate: (playTemplateId: string) => Promise<void>;
  onClose: () => void;
};

export function RecommendPlaysModal({ roadmapId, onActivate, onClose }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/roadmap/account-play-activations/recommend?roadmapId=${roadmapId}`)
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roadmapId]);

  const handleActivate = async (playTemplateId: string) => {
    setActivatingId(playTemplateId);
    try {
      await onActivate(playTemplateId);
      setRecommendations((prev) =>
        prev.map((r) => (r.playTemplateId === playTemplateId ? { ...r, alreadyActivated: true } : r))
      );
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl border border-border bg-background shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Recommended Plays</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Based on account profile, signals, and divisions
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse text-center py-8">
              Analyzing account profile...
            </p>
          ) : recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recommendations found. Try adding more account data (industry, departments, signals).
            </p>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.playTemplateId}
                className={`rounded-lg border p-3 transition-colors ${
                  rec.alreadyActivated
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-border bg-card/60 hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{rec.name}</span>
                      {rec.score > 0 && (
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                          {rec.score}pt
                        </span>
                      )}
                    </div>
                    {rec.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {rec.description}
                      </p>
                    )}
                    {rec.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rec.reasons.map((reason, i) => (
                          <span
                            key={i}
                            className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {rec.alreadyActivated ? (
                      <span className="text-[10px] text-emerald-400 font-medium px-2 py-1">
                        Activated
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={activatingId === rec.playTemplateId}
                        onClick={() => handleActivate(rec.playTemplateId)}
                        className="text-[10px] font-medium bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {activatingId === rec.playTemplateId ? 'Adding...' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
