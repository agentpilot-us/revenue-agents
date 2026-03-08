'use client';

import { useState, useEffect } from 'react';
import { PlanPreviewModal } from './PlanPreviewModal';

type Template = {
  id: string;
  name: string;
  slug: string;
  isBuiltIn: boolean;
  phases: Array<{
    id: string;
    phaseOrder: number;
    name: string;
    description: string | null;
    weekRange: string | null;
    suggestedPlanTypes: string[] | null;
  }>;
};

type DivisionTarget = {
  id: string;
  label: string;
};

type Props = {
  roadmapId: string;
  targetId?: string;
  targetLabel?: string;
  targets?: DivisionTarget[];
};

export function SalesMapTemplatePicker({ roadmapId, targetId, targetLabel, targets }: Props) {
  const allTargets: DivisionTarget[] = targets && targets.length > 0
    ? targets
    : targetId ? [{ id: targetId, label: targetLabel ?? 'Division' }] : [];

  const [activeTargetId, setActiveTargetId] = useState(allTargets[0]?.id ?? '');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ phases: unknown[] } | null>(null);
  const activeLabel = allTargets.find((t) => t.id === activeTargetId)?.label ?? '';

  useEffect(() => {
    fetch('/api/roadmap/templates')
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) setTemplates(data.templates);
      })
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedId || !activeTargetId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/roadmap/targets/${activeTargetId}/generate-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedId, roadmapId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Generation failed (${res.status})`);
        return;
      }
      if (data.preview) {
        setPreview(data.preview);
      } else {
        setError('No preview returned from the generator');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error during generation');
    } finally {
      setGenerating(false);
    }
  };

  const selected = templates.find((t) => t.id === selectedId);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading templates...</p>;
  }

  if (allTargets.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Generate Plays
      </h3>

      {allTargets.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allTargets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setActiveTargetId(t.id); setPreview(null); setError(null); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTargetId === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700/50 text-gray-400 hover:text-gray-200 hover:bg-zinc-600/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Select a selling motion template for <span className="font-medium text-gray-300">{activeLabel}</span>. The AI will generate specific plays within each phase using account context.
      </p>

      {templates.length === 0 && (
        <p className="text-xs text-amber-400 mb-3">
          No Sales Map templates found. Run <code className="bg-zinc-700 px-1 rounded text-[10px]">npm run seed:sales-map-templates</code> to seed the built-in templates.
        </p>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            className={`text-left rounded-lg border p-3 transition-all ${
              selectedId === t.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-200 dark:border-zinc-600 hover:border-blue-500/30'
            }`}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t.name}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              {t.phases.length} phase{t.phases.length !== 1 ? 's' : ''}
              {t.isBuiltIn ? ' · Built-in' : ''}
            </p>
          </button>
        ))}
      </div>

      {/* Phase preview for selected template */}
      {selected && (
        <div className="mb-3 rounded-lg bg-gray-50 dark:bg-zinc-700/50 p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Phases:
          </p>
          <div className="space-y-1.5">
            {selected.phases.map((p) => (
              <div key={p.id} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-blue-400 mt-0.5">
                  {p.phaseOrder}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {p.name}
                    {p.weekRange && (
                      <span className="ml-1 text-gray-500 font-normal">
                        ({p.weekRange})
                      </span>
                    )}
                  </p>
                  {p.description && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!selectedId || generating}
        className="w-full text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {generating ? 'Generating Plays...' : 'Generate Play Preview'}
      </button>

      {/* Preview modal */}
      {preview && selectedId && (
        <PlanPreviewModal
          preview={preview as { phases: Array<{ phaseOrder: number; phaseName: string; weekRange: string | null; plans: Array<{ title: string; description: string; phaseOrder: number; phaseName: string; weekRange: string | null; contentType: string; targetDivisionName?: string; targetContactRole?: string; triggerSignalType?: string; productFraming?: string; existingProductReference?: string; objectionAddressed?: string }> }> }}
          roadmapId={roadmapId}
          targetId={activeTargetId}
          templateId={selectedId}
          onClose={() => setPreview(null)}
          onRegenerate={handleGenerate}
        />
      )}
    </div>
  );
}
