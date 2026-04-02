'use client';

import { useState, useEffect } from 'react';
import type {
  ContentHealthScore,
  ContentHealthDimension,
  ContentHealthGap,
  ContentHealthRecommendation,
} from '@/lib/content-library/structured-extraction';

/** Event dispatched when content is confirmed/approved so the health panel refetches. */
export const CONTENT_LIBRARY_HEALTH_INVALIDATE = 'content-library-health-invalidate';

function fetchHealth(): Promise<ContentHealthScore> {
  return fetch('/api/content-library/health').then((res) => {
    if (!res.ok) {
      return res.json().catch(() => ({})).then((data) => {
        throw new Error(data.error || 'Failed to load health');
      });
    }
    return res.json();
  });
}

export function ContentLibraryHealthPanel() {
  const [health, setHealth] = useState<ContentHealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHealth();
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchHealth()
        .then((data) => {
          setHealth(data);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    };
    window.addEventListener(CONTENT_LIBRARY_HEALTH_INVALIDATE, handler);
    return () => window.removeEventListener(CONTENT_LIBRARY_HEALTH_INVALIDATE, handler);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="h-4 w-full bg-muted rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm text-sm text-muted-foreground">
        {error || 'Content health unavailable'}
      </div>
    );
  }

  const gradeColors: Record<string, string> = {
    Strong: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    Good: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    'Needs Work': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    Incomplete: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
      <h2 className="font-semibold text-foreground mb-3">Content health</h2>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-foreground">
            {health.overallScore}
          </div>
          <div>
            <span className={`px-2 py-0.5 text-sm font-medium rounded ${gradeColors[health.grade] ?? gradeColors.Incomplete}`}>
              {health.grade}
            </span>
          </div>
        </div>
        {health.lowConfidenceCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {health.lowConfidenceCount} low-confidence extraction{health.lowConfidenceCount !== 1 ? 's' : ''} — consider reviewing
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {health.dimensions.map((d) => (
          <DimensionBar key={d.name} dimension={d} />
        ))}
      </div>

      {health.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Top recommendations</h3>
          <ul className="space-y-2">
            {health.recommendations.map((rec) => (
              <RecommendationItem key={rec.priority} rec={rec} />
            ))}
          </ul>
        </div>
      )}

      {health.gaps.length > 0 && health.recommendations.length === 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Gaps</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {health.gaps.slice(0, 3).map((g) => (
              <li key={g.type}>• {g.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Display total per dimension: "have / target" — target is the goal; found can exceed it. We cap the displayed numerator at target so we never show e.g. 41/10. */
const DIMENSION_DISPLAY_TOTAL: Record<string, number> = {
  'Value Propositions': 10,
  'Product Capabilities': 10,
  'Customer Proof Points': 10,
  Differentiators: 10,
  'Target Personas': 10,
  'Case Studies': 10,
  'Use Cases': 10,
  'Pricing Stance': 1,
};

function DimensionBar({ dimension }: { dimension: ContentHealthDimension }) {
  const [expanded, setExpanded] = useState(false);
  const total = DIMENSION_DISPLAY_TOTAL[dimension.name] ?? 10;
  const have = dimension.found;
  // Display as "X/target" with X capped at target so we never show e.g. 41/10; when over target show "10/10 (41 found)"
  const displayHave = Math.min(have, total);
  const barPct = total > 0 ? Math.min(100, Math.round((have / total) * 100)) : 0;
  const statusColors = {
    complete: 'bg-green-500',
    partial: 'bg-amber-500',
    missing: 'bg-muted-foreground/30',
  };
  const hasItems = dimension.items?.length > 0;
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-0.5">
        <span className="text-foreground">{dimension.name}</span>
        <span className="text-muted-foreground">
          {displayHave}/{total}
          {have > total && <span className="ml-0.5 text-muted-foreground/80">({have} found)</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${statusColors[dimension.status]}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      {hasItems && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs text-primary hover:underline"
          >
            {expanded ? 'Hide what we have' : 'View what we have'}
          </button>
          {expanded && (
            <ul className="mt-1.5 pl-4 list-disc text-xs text-muted-foreground space-y-0.5">
              {dimension.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function RecommendationItem({ rec }: { rec: ContentHealthRecommendation }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm p-2 rounded-md border border-border/60 bg-muted/30">
      <span className="font-medium text-foreground">
        {rec.priority}. {rec.action}
      </span>
      <span className="text-muted-foreground text-xs sm:text-sm">{rec.reason}</span>
      {rec.inputType === 'url' && (
        <span className="text-xs text-primary shrink-0">Paste URL above</span>
      )}
    </li>
  );
}
