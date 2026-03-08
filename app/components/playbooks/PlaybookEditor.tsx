'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PlaybookStepEditor, { type StepData } from './PlaybookStepEditor';

type PlaybookData = {
  id?: string;
  name: string;
  description: string;
  triggerType: string;
  targetDepartmentTypes: string[];
  targetIndustries: string[];
  targetPersonas: string[];
  timingConfig: { triggerDaysBefore?: number; validWindowDays?: number; urgencyDecay?: string };
  expectedOutcome: string;
  priority: number;
};

type Props = {
  templateId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
};

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'signal', label: 'Signal Response' },
  { value: 'new_exec_intro', label: 'New Executive' },
  { value: 'event', label: 'Event' },
  { value: 'feature_release', label: 'Product/Feature Release' },
  { value: 'renewal', label: 'Renewal' },
  { value: 're_engagement', label: 'Re-Engagement' },
  { value: 'new_logo', label: 'New Logo' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'champion_development', label: 'Champion Development' },
  { value: 'competitive_displacement', label: 'Competitive Displacement' },
];

const DEPARTMENT_TYPES = [
  'ENGINEERING', 'AUTONOMOUS_VEHICLES', 'MANUFACTURING_OPERATIONS',
  'IT_DATA_CENTER', 'CONNECTED_SERVICES', 'MARKETING', 'FINANCE',
  'SALES', 'OPERATIONS', 'EXECUTIVE',
];

const PERSONAS = ['C-Suite', 'VP', 'Director', 'Manager', 'Individual Contributor'];

const PHASE_ORDER = ['signal', 'prep', 'activate', 'engage', 'convert', 'advocacy'];
const PHASE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  signal:   { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
  prep:     { text: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
  activate: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' },
  engage:   { text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  convert:  { text: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.25)' },
  advocacy: { text: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)' },
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email', linkedin: 'LinkedIn', meeting: 'Meeting', call: 'Call',
  task: 'Task', internal: 'Internal', ad_brief: 'Ads', event: 'Event',
  crm: 'CRM', in_product: 'In-Product', demo: 'Demo', proposal: 'Proposal',
  case_study: 'Case Study', video: 'Video',
};

function emptyStep(order: number): StepData {
  return {
    order,
    name: '',
    description: '',
    channel: '',
    assetTypes: [],
    promptHint: '',
    dayOffset: null,
    phase: '',
    targetPersona: '',
    assignedRole: '',
    playId: '',
    requiresApproval: false,
  };
}

export default function PlaybookEditor({ templateId, onSaved, onCancel }: Props) {
  const [playbook, setPlaybook] = useState<PlaybookData>({
    name: '',
    description: '',
    triggerType: 'manual',
    targetDepartmentTypes: [],
    targetIndustries: [],
    targetPersonas: [],
    timingConfig: {},
    expectedOutcome: '',
    priority: 0,
  });
  const [steps, setSteps] = useState<StepData[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!templateId);
  const [showTimeline, setShowTimeline] = useState(true);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    try {
      const res = await fetch(`/api/playbooks/templates/${templateId}`);
      if (!res.ok) return;
      const { template } = await res.json();
      setPlaybook({
        id: template.id,
        name: template.name ?? '',
        description: template.description ?? '',
        triggerType: template.triggerType ?? 'manual',
        targetDepartmentTypes: (template.targetDepartmentTypes as string[]) ?? [],
        targetIndustries: (template.targetIndustries as string[]) ?? [],
        targetPersonas: (template.targetPersonas as string[]) ?? [],
        timingConfig: (template.timingConfig as PlaybookData['timingConfig']) ?? {},
        expectedOutcome: template.expectedOutcome ?? '',
        priority: template.priority ?? 0,
      });
      setSteps(
        (template.steps ?? []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          order: s.order as number,
          name: (s.name as string) ?? '',
          description: (s.description as string) ?? '',
          channel: (s.channel as string) ?? '',
          assetTypes: (s.assetTypes as string[]) ?? [],
          promptHint: (s.promptHint as string) ?? '',
          dayOffset: s.dayOffset as number | null,
          phase: (s.phase as string) ?? '',
          targetPersona: (s.targetPersona as string) ?? '',
          assignedRole: (s.assignedRole as string) ?? '',
          playId: (s.playId as string) ?? '',
          requiresApproval: (s.requiresApproval as boolean) ?? false,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const update = (partial: Partial<PlaybookData>) => {
    setPlaybook((p) => ({ ...p, ...partial }));
  };

  const toggleArrayItem = (field: 'targetDepartmentTypes' | 'targetIndustries' | 'targetPersonas', val: string) => {
    const arr = playbook[field];
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    update({ [field]: next });
  };

  const addStep = () => {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newSteps = [...steps];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    setSteps(newSteps.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSave = async () => {
    if (!playbook.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: playbook.name.trim(),
        description: playbook.description || null,
        triggerType: playbook.triggerType,
        targetDepartmentTypes: playbook.targetDepartmentTypes.length > 0 ? playbook.targetDepartmentTypes : null,
        targetIndustries: playbook.targetIndustries.length > 0 ? playbook.targetIndustries : null,
        targetPersonas: playbook.targetPersonas.length > 0 ? playbook.targetPersonas : null,
        timingConfig: Object.keys(playbook.timingConfig).length > 0 ? playbook.timingConfig : null,
        expectedOutcome: playbook.expectedOutcome || null,
        priority: playbook.priority,
      };

      let savedId = templateId;

      if (templateId) {
        await fetch(`/api/playbooks/templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        const res = await fetch('/api/playbooks/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        savedId = data.template?.id;
      }

      if (savedId) {
        for (const step of steps) {
          const stepBody = {
            name: step.name || null,
            description: step.description || null,
            channel: step.channel || null,
            assetTypes: step.assetTypes.length > 0 ? step.assetTypes : null,
            promptHint: step.promptHint || null,
            dayOffset: step.dayOffset,
            order: step.order,
            phase: step.phase || null,
            targetPersona: step.targetPersona || null,
            assignedRole: step.assignedRole || null,
            playId: step.playId || null,
            requiresApproval: step.requiresApproval,
          };

          if (step.id) {
            await fetch(`/api/playbooks/templates/${savedId}/steps/${step.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(stepBody),
            });
          } else {
            await fetch(`/api/playbooks/templates/${savedId}/steps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(stepBody),
            });
          }
        }
      }

      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  // Group steps by phase for the timeline view
  const phaseGroups = useMemo(() => {
    const groups: { phase: string; steps: StepData[] }[] = [];
    const seen = new Set<string>();
    for (const s of steps) {
      const p = s.phase || 'unphased';
      if (!seen.has(p)) {
        seen.add(p);
        groups.push({ phase: p, steps: [] });
      }
      groups.find((g) => g.phase === p)!.steps.push(s);
    }
    groups.sort((a, b) => {
      const ai = PHASE_ORDER.indexOf(a.phase);
      const bi = PHASE_ORDER.indexOf(b.phase);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return groups;
  }, [steps]);

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading playbook...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Playbook Name</label>
          <input
            type="text"
            value={playbook.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Expansion Cross-Sell Play, New Logo 60-Day Pursuit"
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Description</label>
          <textarea
            value={playbook.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What does this playbook do? When should it be used?"
            rows={2}
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Trigger Type</label>
            <select
              value={playbook.triggerType}
              onChange={(e) => update({ triggerType: e.target.value })}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Priority</label>
            <input
              type="number"
              value={playbook.priority}
              onChange={(e) => update({ priority: Number(e.target.value) || 0 })}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Targeting */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Targeting</h4>
        <div>
          <label className="block text-xs font-medium mb-1.5">Department Types</label>
          <div className="flex flex-wrap gap-1.5">
            {DEPARTMENT_TYPES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleArrayItem('targetDepartmentTypes', d)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  playbook.targetDepartmentTypes.includes(d)
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-border text-muted-foreground hover:border-blue-500/50'
                }`}
              >
                {d.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5">Industries</label>
          <input
            type="text"
            value={playbook.targetIndustries.join(', ')}
            onChange={(e) =>
              update({
                targetIndustries: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Automotive, Manufacturing, Technology..."
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5">Target Personas</label>
          <div className="flex flex-wrap gap-1.5">
            {PERSONAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleArrayItem('targetPersonas', p)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  playbook.targetPersonas.includes(p)
                    ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                    : 'border-border text-muted-foreground hover:border-violet-500/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timing */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timing</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Trigger Days Before</label>
            <input
              type="number"
              value={playbook.timingConfig.triggerDaysBefore ?? ''}
              onChange={(e) =>
                update({
                  timingConfig: {
                    ...playbook.timingConfig,
                    triggerDaysBefore: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              placeholder="e.g. 120 (for renewals)"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Valid Window (days)</label>
            <input
              type="number"
              value={playbook.timingConfig.validWindowDays ?? ''}
              onChange={(e) =>
                update({
                  timingConfig: {
                    ...playbook.timingConfig,
                    validWindowDays: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              placeholder="e.g. 30"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Expected Outcome */}
      <div>
        <label className="block text-xs font-medium mb-1">Expected Outcome</label>
        <textarea
          value={playbook.expectedOutcome}
          onChange={(e) => update({ expectedOutcome: e.target.value })}
          placeholder="What does success look like? e.g. Meeting booked with VP within 2 weeks"
          rows={2}
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Play Overview Timeline */}
      {steps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Play Overview
            </h4>
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className="text-[11px] text-blue-400 hover:text-blue-300"
            >
              {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
            </button>
          </div>

          {showTimeline && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-card/60 border-b border-border">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-20">Phase</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-16">Day</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-28">Persona</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Channel</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseGroups.map((group) =>
                    group.steps.map((s, si) => {
                      const pc = s.phase ? PHASE_COLORS[s.phase] : null;
                      return (
                        <tr
                          key={s.id ?? `${group.phase}-${si}`}
                          className="border-b border-border/50 last:border-b-0"
                          style={{ background: pc?.bg ?? 'transparent' }}
                        >
                          <td className="px-3 py-1.5">
                            {si === 0 && s.phase ? (
                              <span
                                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{ color: pc?.text, background: pc?.bg, border: `1px solid ${pc?.border}` }}
                              >
                                {s.phase}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {s.dayOffset != null ? `Day ${s.dayOffset}` : '—'}
                          </td>
                          <td className="px-3 py-1.5">
                            {s.targetPersona || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-1.5">
                            {CHANNEL_LABELS[s.channel] || s.channel || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="font-medium">{s.name}</span>
                            {s.description && (
                              <span className="text-muted-foreground ml-1">— {s.description}</span>
                            )}
                          </td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Steps Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Action Steps ({steps.length})
          </h4>
          <button
            type="button"
            onClick={addStep}
            className="text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            + Add Step
          </button>
        </div>

        {steps.map((step, idx) => (
          <PlaybookStepEditor
            key={step.id ?? `new-${idx}`}
            step={step}
            index={idx}
            total={steps.length}
            onUpdate={(updated) => {
              const next = [...steps];
              next[idx] = updated;
              setSteps(next);
            }}
            onRemove={() => setSteps(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))}
            onMoveUp={() => moveStep(idx, -1)}
            onMoveDown={() => moveStep(idx, 1)}
          />
        ))}

        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No steps yet. Click &quot;+ Add Step&quot; to define the action sequence.
          </p>
        )}
      </div>

      {/* Save / Cancel */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !playbook.name.trim()}
          className="text-sm font-medium bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : templateId ? 'Update Playbook' : 'Create Playbook'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
