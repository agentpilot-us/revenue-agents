'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ObjectiveShape = { goalText?: string; [key: string]: unknown };
type ContentStrategyShape = Record<string, unknown>;

type SalesMapEditorProps = {
  roadmapType: string;
  objective: ObjectiveShape | null;
  contentStrategy: ContentStrategyShape | null;
};

const ROADMAP_TYPES = [
  { value: 'enterprise_expansion', label: 'Enterprise expansion' },
  { value: 'channel_influence', label: 'Channel influence' },
  { value: 'value_of_data', label: 'Value of data' },
];

function safeJsonParse<T>(raw: string, fallback: T): T {
  const t = raw.trim();
  if (!t) return fallback;
  try {
    return JSON.parse(t) as T;
  } catch {
    return fallback;
  }
}

export function SalesMapEditor({
  roadmapType: initialRoadmapType,
  objective: initialObjective,
  contentStrategy: initialContentStrategy,
}: SalesMapEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obj = initialObjective ?? {};
  const strat = initialContentStrategy ?? {};
  const goalText = typeof obj.goalText === 'string' ? obj.goalText : '';

  const [roadmapType, setRoadmapType] = useState(initialRoadmapType);
  const [goalTextInput, setGoalTextInput] = useState(goalText);
  const [objectiveJson, setObjectiveJson] = useState(() =>
    JSON.stringify(initialObjective ?? {}, null, 2)
  );
  const [contentStrategyJson, setContentStrategyJson] = useState(() =>
    JSON.stringify(initialContentStrategy ?? {}, null, 2)
  );

  const startEditing = () => {
    setEditing(true);
    setError(null);
    setRoadmapType(initialRoadmapType);
    setGoalTextInput(typeof (initialObjective as { goalText?: string })?.goalText === 'string' ? (initialObjective as { goalText?: string }).goalText! : '');
    setObjectiveJson(JSON.stringify(initialObjective ?? {}, null, 2));
    setContentStrategyJson(JSON.stringify(initialContentStrategy ?? {}, null, 2));
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const objective: ObjectiveShape = safeJsonParse(objectiveJson, {});
      if (goalTextInput.trim()) {
        objective.goalText = goalTextInput.trim();
      }
      const contentStrategy = safeJsonParse<ContentStrategyShape>(contentStrategyJson, {});

      const res = await fetch('/api/roadmap/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapType: roadmapType.trim() || undefined,
          objective: Object.keys(objective).length ? objective : undefined,
          contentStrategy: Object.keys(contentStrategy).length ? contentStrategy : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const sectionCls =
    'rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground';
  const labelCls = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block';
  const inputCls =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (!editing) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Your Sales Map</h1>
          <button
            type="button"
            onClick={startEditing}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Edit
          </button>
        </div>

        <section>
          <h2 className={labelCls}>Roadmap type</h2>
          <div className={sectionCls}>
            <span className="font-medium text-amber-400">{initialRoadmapType.replace(/_/g, ' ')}</span>
          </div>
        </section>

        <section>
          <h2 className={labelCls}>Objective</h2>
          <div className={sectionCls}>
            {goalText ? (
              <p className="text-foreground font-medium mb-2">{goalText}</p>
            ) : null}
            <pre className="whitespace-pre-wrap break-words text-muted-foreground text-xs">
              {JSON.stringify(initialObjective ?? {}, null, 2)}
            </pre>
          </div>
        </section>

        <section>
          <h2 className={labelCls}>Content strategy</h2>
          <div className={sectionCls}>
            <pre className="whitespace-pre-wrap break-words text-muted-foreground text-xs">
              {JSON.stringify(initialContentStrategy ?? {}, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Edit Sales Map</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
            className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <section>
        <label htmlFor="roadmap-type" className={labelCls}>
          Roadmap type
        </label>
        <select
          id="roadmap-type"
          value={roadmapType}
          onChange={(e) => setRoadmapType(e.target.value)}
          className={inputCls}
        >
          {ROADMAP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <label htmlFor="goal-text" className={labelCls}>
          Goal (summary)
        </label>
        <input
          id="goal-text"
          type="text"
          value={goalTextInput}
          onChange={(e) => setGoalTextInput(e.target.value)}
          placeholder="e.g. Land 2 new divisional use cases at General Motors this year"
          className={inputCls}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          This appears in the Objective Bar on the dashboard.
        </p>
      </section>

      <section>
        <label htmlFor="objective-json" className={labelCls}>
          Objective (full JSON)
        </label>
        <textarea
          id="objective-json"
          value={objectiveJson}
          onChange={(e) => setObjectiveJson(e.target.value)}
          rows={8}
          className={`${inputCls} font-mono text-xs`}
          spellCheck={false}
        />
      </section>

      <section>
        <label htmlFor="content-strategy-json" className={labelCls}>
          Content strategy (JSON)
        </label>
        <textarea
          id="content-strategy-json"
          value={contentStrategyJson}
          onChange={(e) => setContentStrategyJson(e.target.value)}
          rows={10}
          className={`${inputCls} font-mono text-xs`}
          spellCheck={false}
        />
      </section>
    </div>
  );
}
