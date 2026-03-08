'use client';

import { useState } from 'react';

export type StepData = {
  id?: string;
  order: number;
  name: string;
  description: string;
  channel: string;
  assetTypes: string[];
  promptHint: string;
  dayOffset: number | null;
  phase: string;
  targetPersona: string;
  assignedRole: string;
  playId: string;
  requiresApproval: boolean;
};

type Props = {
  step: StepData;
  index: number;
  total: number;
  onUpdate: (step: StepData) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

const PHASES = [
  { value: '', label: 'No phase' },
  { value: 'signal', label: 'Signal' },
  { value: 'prep', label: 'Prep' },
  { value: 'activate', label: 'Activate' },
  { value: 'engage', label: 'Engage' },
  { value: 'convert', label: 'Convert' },
  { value: 'advocacy', label: 'Advocacy' },
];

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'task', label: 'Task' },
  { value: 'internal', label: 'Internal' },
  { value: 'ad_brief', label: 'Ads / Ad Brief' },
  { value: 'event', label: 'Event' },
  { value: 'crm', label: 'CRM' },
  { value: 'in_product', label: 'In-Product' },
  { value: 'demo', label: 'Demo' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'video', label: 'Video' },
];

const CONTENT_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin_inmail', label: 'LinkedIn InMail' },
  { value: 'linkedin_post', label: 'LinkedIn Post' },
  { value: 'talking_points', label: 'Talking Points' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'sms', label: 'SMS' },
  { value: 'ad_brief', label: 'Ad Brief' },
  { value: 'business_case', label: 'Business Case' },
  { value: 'roi_model', label: 'ROI Model' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'demo_script', label: 'Demo Script' },
  { value: 'event_invite', label: 'Event Invite' },
  { value: 'in_product_nudge', label: 'In-Product Nudge' },
];

const PERSONA_SUGGESTIONS = [
  'Champion', 'Economic Buyer', 'Technical Buyer', 'End Users',
  'New Dept Buyer', 'Full Committee', 'Executive Sponsor', 'Influencer',
];

const ROLES = [
  { value: '', label: 'Not assigned' },
  { value: 'ae', label: 'AE' },
  { value: 'csm', label: 'CSM' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'revops', label: 'RevOps' },
];

const PHASE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  signal:   { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)' },
  prep:     { text: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)' },
  activate: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)' },
  engage:   { text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
  convert:  { text: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.3)' },
  advocacy: { text: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.3)' },
};

export default function PlaybookStepEditor({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [expanded, setExpanded] = useState(!step.id);
  const [showPersonaSuggestions, setShowPersonaSuggestions] = useState(false);

  const update = (partial: Partial<StepData>) => {
    onUpdate({ ...step, ...partial });
  };

  const toggleAssetType = (val: string) => {
    const types = step.assetTypes.includes(val)
      ? step.assetTypes.filter((t) => t !== val)
      : [...step.assetTypes, val];
    update({ assetTypes: types });
  };

  const pc = step.phase ? PHASE_COLORS[step.phase] : null;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: pc?.border ?? 'var(--border)',
        background: pc?.bg ?? 'var(--card)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-bold text-muted-foreground w-6 text-center">
          {index + 1}
        </span>

        {step.phase && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: pc?.text, background: pc?.bg, border: `1px solid ${pc?.border}` }}
          >
            {step.phase}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">
            {step.name || 'Untitled Step'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {[
              CHANNELS.find((c) => c.value === step.channel)?.label,
              step.dayOffset != null ? `Day ${step.dayOffset}` : null,
              step.targetPersona || null,
              step.assignedRole ? ROLES.find((r) => r.value === step.assignedRole)?.label : null,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1 disabled:opacity-30"
          >
            &uarr;
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === total - 1}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1 disabled:opacity-30"
          >
            &darr;
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-[10px] text-red-400 hover:text-red-300 px-1"
          >
            Remove
          </button>
          <span className="text-[10px] text-muted-foreground ml-1">
            {expanded ? '\u25B2' : '\u25BC'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: pc?.border ?? 'var(--border)' }}>
          {/* Row 1: Phase + Day + Channel */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Phase</label>
              <select
                value={step.phase}
                onChange={(e) => update({ phase: e.target.value })}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Day Offset</label>
              <input
                type="number"
                value={step.dayOffset ?? ''}
                onChange={(e) => update({ dayOffset: e.target.value ? Number(e.target.value) : null })}
                placeholder="0"
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Channel</label>
              <select
                value={step.channel}
                onChange={(e) => update({ channel: e.target.value })}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select channel...</option>
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Target Persona + Assigned Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-medium mb-1">Target Persona</label>
              <input
                type="text"
                value={step.targetPersona}
                onChange={(e) => update({ targetPersona: e.target.value })}
                onFocus={() => setShowPersonaSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPersonaSuggestions(false), 150)}
                placeholder="e.g. Champion, Economic Buyer..."
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {showPersonaSuggestions && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                  {PERSONA_SUGGESTIONS.filter(
                    (p) => !step.targetPersona || p.toLowerCase().includes(step.targetPersona.toLowerCase()),
                  ).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="block w-full text-left text-sm px-3 py-1.5 hover:bg-card/60 text-foreground"
                      onMouseDown={() => update({ targetPersona: p })}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Assigned Role</label>
              <select
                value={step.assignedRole}
                onChange={(e) => update({ assignedRole: e.target.value })}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Step Name */}
          <div>
            <label className="block text-xs font-medium mb-1">Step Name</label>
            <input
              type="text"
              value={step.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Share expansion blueprint with champion"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="block text-xs font-medium mb-1">Action Description</label>
            <input
              type="text"
              value={step.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe what the AE should do in this step"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Row 5: Content Types */}
          <div>
            <label className="block text-xs font-medium mb-1">Content Types</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => toggleAssetType(ct.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    step.assetTypes.includes(ct.value)
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-border text-muted-foreground hover:border-blue-500/50'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 6: Prompt Hint */}
          <div>
            <label className="block text-xs font-medium mb-1">Prompt Hint</label>
            <textarea
              value={step.promptHint}
              onChange={(e) => update({ promptHint: e.target.value })}
              placeholder="Instructions for the AI content engine..."
              rows={2}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Row 7: Play ID + Requires Approval */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Play ID</label>
              <input
                type="text"
                value={step.playId}
                onChange={(e) => update({ playId: e.target.value })}
                placeholder="Content generation key (optional)"
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
              <input
                type="checkbox"
                checked={step.requiresApproval}
                onChange={(e) => update({ requiresApproval: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-xs">Requires Approval</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
