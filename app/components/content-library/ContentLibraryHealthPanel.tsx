'use client';

import { useState, useEffect } from 'react';
import type {
  ContentHealthScore,
  ContentHealthDimension,
  ContentHealthGap,
  ContentHealthRecommendation,
} from '@/lib/content-library/structured-extraction';

export function ContentLibraryHealthPanel() {
  const [health, setHealth] = useState<ContentHealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/content-library/health');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load health');
        }
        const data = await res.json();
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-700 rounded mb-4" />
        <div className="h-4 w-full bg-slate-100 dark:bg-zinc-700 rounded mb-2" />
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6 text-sm text-gray-500 dark:text-gray-400">
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Content health</h2>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-gray-100">
            {health.overallScore}
          </div>
          <div>
            <span className={`px-2 py-0.5 text-sm font-medium rounded ${gradeColors[health.grade] ?? gradeColors.Incomplete}`}>
              {health.grade}
            </span>
          </div>
        </div>
        {health.pendingReviewCount > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {health.pendingReviewCount} item{health.pendingReviewCount !== 1 ? 's' : ''} pending your review
          </p>
        )}
        {health.lowConfidenceCount > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {health.lowConfidenceCount} low-confidence extraction{health.lowConfidenceCount !== 1 ? 's' : ''} — consider reviewing
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {health.dimensions.map((d) => (
          <DimensionBar key={d.name} dimension={d} />
        ))}
      </div>

      {(health.readyForDemo || health.readyForOutreach || health.readyForBuyingGroups) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {health.readyForDemo && (
            <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              Ready for demo
            </span>
          )}
          {health.readyForOutreach && (
            <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Ready for outreach
            </span>
          )}
          {health.readyForBuyingGroups && (
            <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              Ready for buying groups
            </span>
          )}
        </div>
      )}

      {health.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top recommendations</h3>
          <ul className="space-y-2">
            {health.recommendations.map((rec) => (
              <RecommendationItem key={rec.priority} rec={rec} />
            ))}
          </ul>
        </div>
      )}

      {health.gaps.length > 0 && health.recommendations.length === 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gaps</h3>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {health.gaps.slice(0, 3).map((g) => (
              <li key={g.type}>• {g.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DimensionBar({ dimension }: { dimension: ContentHealthDimension }) {
  const statusColors = {
    complete: 'bg-green-500',
    partial: 'bg-amber-500',
    missing: 'bg-slate-300 dark:bg-zinc-600',
  };
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-0.5">
        <span className="text-gray-700 dark:text-gray-300">{dimension.name}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {dimension.found}/{dimension.target}
          {dimension.pendingCount != null && dimension.pendingCount > 0 && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">({dimension.pendingCount} pending)</span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${statusColors[dimension.status]}`}
          style={{ width: `${Math.min(100, dimension.score)}%` }}
        />
      </div>
    </div>
  );
}

function RecommendationItem({ rec }: { rec: ContentHealthRecommendation }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm p-2 rounded bg-slate-50 dark:bg-zinc-800/50">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {rec.priority}. {rec.action}
      </span>
      <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{rec.reason}</span>
      {rec.inputType === 'url' && (
        <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">Paste URL above</span>
      )}
    </li>
  );
}
