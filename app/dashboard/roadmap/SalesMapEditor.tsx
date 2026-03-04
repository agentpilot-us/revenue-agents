'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MetricShape = { type?: string; targetCount?: number; timeHorizon?: string };
type ObjectiveShape = {
  goalText?: string;
  metric?: MetricShape;
  accountContext?: Record<string, unknown>;
  partnerContext?: Record<string, unknown>;
  successDefinition?: { dealDefinition?: string };
  [key: string]: unknown;
};
type ContentStrategyShape = {
  tone?: string;
  primaryChannels?: string[];
  contentTypes?: string[];
  personalizationDepth?: string;
  voiceNotes?: string[];
  [key: string]: unknown;
};

type SalesMapEditorProps = {
  roadmapType: string;
  objective: ObjectiveShape | null;
  contentStrategy: ContentStrategyShape | null;
  companyId: string;
  companyName: string;
};

const ROADMAP_TYPES = [
  { value: 'enterprise_expansion', label: 'Enterprise Expansion' },
  { value: 'channel_influence', label: 'Channel Influence' },
  { value: 'value_of_data', label: 'Value of Data' },
];

const METRIC_TYPES = [
  { value: 'new_use_cases', label: 'New use cases' },
  { value: 'new_divisional_use_cases', label: 'New divisional use cases' },
  { value: 'partner_sourced_deals', label: 'Partner-sourced deals' },
  { value: 'net_new_logos', label: 'Net-new logos' },
  { value: 'revenue', label: 'Revenue' },
];

const TIME_HORIZONS = [
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_year', label: 'This year' },
  { value: 'next_quarter', label: 'Next quarter' },
];

const TONE_OPTIONS = [
  { value: 'consultative', label: 'Consultative' },
  { value: 'consultative_relationship_driven', label: 'Consultative & Relationship-Driven' },
  { value: 'executive_consultative_technical', label: 'Executive / Technical' },
  { value: 'data_driven_outcome_focused', label: 'Data-Driven & Outcome-Focused' },
  { value: 'casual', label: 'Casual' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'short_email', label: 'Short Email' },
  { value: 'executive_email', label: 'Executive Email' },
  { value: 'linkedin_dm', label: 'LinkedIn DM' },
  { value: 'sales_page', label: 'Sales Page' },
  { value: 'division_briefing_doc', label: 'Division Briefing' },
  { value: 'interactive_preview_page', label: 'Interactive Preview' },
  { value: 'presentation', label: 'Presentation' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'executive_briefing', label: 'Executive Briefing' },
  { value: 'use_case_page', label: 'Use Case Page' },
  { value: 'division_specific_sales_page', label: 'Division Sales Page' },
  { value: 'co_sell_brief', label: 'Co-Sell Brief' },
  { value: 'why_bring_us_in_one_pager', label: 'Why Bring Us In' },
  { value: 'deal_win_follow_up_message', label: 'Deal Win Follow-Up' },
  { value: 'partner_enablement_page', label: 'Partner Enablement Page' },
  { value: 'use_case_comparison_matrix', label: 'Comparison Matrix' },
  { value: 'technical_architecture_brief', label: 'Technical Architecture' },
  { value: 'personalized_data_preview_page', label: 'Data Preview Page' },
  { value: 'roi_calculator', label: 'ROI Calculator' },
  { value: 'competitive_positioning_brief', label: 'Competitive Positioning' },
  { value: 'industry_insight_summary', label: 'Industry Insight' },
  { value: 'event_invite', label: 'Event Invite' },
];

const PERSONALIZATION_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'high_per_ae', label: 'High (per AE)' },
  { value: 'high_per_account', label: 'High (per account)' },
];

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[100px]">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function MultiCheckboxField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (optVal: string) => {
    onChange(
      value.includes(optVal) ? value.filter((v) => v !== optVal) : [...value, optVal]
    );
  };
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
              value.includes(opt.value)
                ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground/50'
            }`}
          >
            <input
              type="checkbox"
              checked={value.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ObjectiveView({ obj }: { obj: ObjectiveShape }) {
  const metric = obj.metric;
  const accountCtx = obj.accountContext as Record<string, unknown> | undefined;
  const partnerCtx = obj.partnerContext as Record<string, unknown> | undefined;
  const successDef = obj.successDefinition?.dealDefinition;

  const metricLine = metric
    ? [
        metric.targetCount,
        METRIC_TYPES.find((m) => m.value === metric.type)?.label ?? formatLabel(metric.type ?? ''),
        TIME_HORIZONS.find((t) => t.value === metric.timeHorizon)?.label ?? formatLabel(metric.timeHorizon ?? ''),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const contextEntries: { label: string; value: string }[] = [];
  if (accountCtx) {
    if (typeof accountCtx.primaryAccount === 'string')
      contextEntries.push({ label: 'Account', value: accountCtx.primaryAccount });
    if (Array.isArray(accountCtx.divisions))
      contextEntries.push({ label: 'Divisions', value: (accountCtx.divisions as string[]).join(', ') });
    if (typeof accountCtx.industry === 'string')
      contextEntries.push({ label: 'Industry', value: accountCtx.industry });
  }
  if (partnerCtx) {
    if (typeof partnerCtx.primaryPartner === 'string')
      contextEntries.push({ label: 'Partner', value: partnerCtx.primaryPartner });
  }

  return (
    <div className="space-y-3">
      {obj.goalText && (
        <p className="text-base font-medium text-foreground leading-relaxed">{obj.goalText}</p>
      )}
      {metricLine && (
        <FieldRow label="Target">
          <Badge>{metricLine}</Badge>
        </FieldRow>
      )}
      {contextEntries.map((e) => (
        <FieldRow key={e.label} label={e.label}>
          {e.value}
        </FieldRow>
      ))}
      {successDef && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground italic">
          {successDef}
        </div>
      )}
      {!obj.goalText && !metricLine && contextEntries.length === 0 && (
        <p className="text-sm text-muted-foreground">No objective configured yet.</p>
      )}
    </div>
  );
}

function ContentStrategyView({ strat }: { strat: ContentStrategyShape }) {
  const toneLabel = TONE_OPTIONS.find((t) => t.value === strat.tone)?.label ?? (strat.tone ? formatLabel(strat.tone) : null);
  const channels = strat.primaryChannels ?? [];
  const contentTypes = strat.contentTypes ?? [];
  const depth = PERSONALIZATION_OPTIONS.find((p) => p.value === strat.personalizationDepth)?.label ??
    (strat.personalizationDepth ? formatLabel(strat.personalizationDepth) : null);
  const voiceNotes = strat.voiceNotes ?? [];
  const isEmpty = !toneLabel && channels.length === 0 && contentTypes.length === 0;

  if (isEmpty) {
    return <p className="text-sm text-muted-foreground">No content strategy configured yet.</p>;
  }

  return (
    <div className="space-y-3">
      {toneLabel && (
        <FieldRow label="Tone">
          <Badge>{toneLabel}</Badge>
        </FieldRow>
      )}
      {channels.length > 0 && (
        <FieldRow label="Channels">
          <div className="flex flex-wrap gap-1.5">
            {channels.map((ch) => (
              <Pill key={ch}>{CHANNEL_OPTIONS.find((o) => o.value === ch)?.label ?? formatLabel(ch)}</Pill>
            ))}
          </div>
        </FieldRow>
      )}
      {contentTypes.length > 0 && (
        <FieldRow label="Content">
          <div className="flex flex-wrap gap-1.5">
            {contentTypes.map((ct) => (
              <Pill key={ct}>{CONTENT_TYPE_OPTIONS.find((o) => o.value === ct)?.label ?? formatLabel(ct)}</Pill>
            ))}
          </div>
        </FieldRow>
      )}
      {depth && (
        <FieldRow label="Personalization">
          <span className="text-sm">{depth}</span>
        </FieldRow>
      )}
      {voiceNotes.length > 0 && (
        <FieldRow label="Voice notes">
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {voiceNotes.map((note, i) => (
              <li key={i} className="text-muted-foreground">{note}</li>
            ))}
          </ul>
        </FieldRow>
      )}
    </div>
  );
}

export function SalesMapEditor({
  roadmapType: initialRoadmapType,
  objective: initialObjective,
  contentStrategy: initialContentStrategy,
  companyId,
  companyName,
}: SalesMapEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obj = initialObjective ?? {};
  const strat = initialContentStrategy ?? {};

  // --- Edit-mode state ---
  const [roadmapType, setRoadmapType] = useState(initialRoadmapType);
  const [goalText, setGoalText] = useState(obj.goalText ?? '');
  const [metricType, setMetricType] = useState(obj.metric?.type ?? '');
  const [targetCount, setTargetCount] = useState(obj.metric?.targetCount ?? 0);
  const [timeHorizon, setTimeHorizon] = useState(obj.metric?.timeHorizon ?? '');
  const [contextNotes, setContextNotes] = useState(() => {
    const ctx = obj.accountContext ?? obj.partnerContext;
    return ctx ? JSON.stringify(ctx, null, 2) : '';
  });
  const [successDef, setSuccessDef] = useState(obj.successDefinition?.dealDefinition ?? '');

  const [tone, setTone] = useState(strat.tone ?? '');
  const [channels, setChannels] = useState<string[]>(strat.primaryChannels ?? []);
  const [contentTypes, setContentTypes] = useState<string[]>(strat.contentTypes ?? []);
  const [personalization, setPersonalization] = useState(strat.personalizationDepth ?? '');
  const [voiceNotes, setVoiceNotes] = useState<string[]>(strat.voiceNotes ?? []);

  const resetEditState = () => {
    setRoadmapType(initialRoadmapType);
    setGoalText(obj.goalText ?? '');
    setMetricType(obj.metric?.type ?? '');
    setTargetCount(obj.metric?.targetCount ?? 0);
    setTimeHorizon(obj.metric?.timeHorizon ?? '');
    const ctx = obj.accountContext ?? obj.partnerContext;
    setContextNotes(ctx ? JSON.stringify(ctx, null, 2) : '');
    setSuccessDef(obj.successDefinition?.dealDefinition ?? '');
    setTone(strat.tone ?? '');
    setChannels(strat.primaryChannels ?? []);
    setContentTypes(strat.contentTypes ?? []);
    setPersonalization(strat.personalizationDepth ?? '');
    setVoiceNotes(strat.voiceNotes ?? []);
  };

  const startEditing = () => {
    resetEditState();
    setEditing(true);
    setError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const objective: ObjectiveShape = {};
      if (goalText.trim()) objective.goalText = goalText.trim();
      if (metricType || targetCount || timeHorizon) {
        objective.metric = {};
        if (metricType) objective.metric.type = metricType;
        if (targetCount) objective.metric.targetCount = targetCount;
        if (timeHorizon) objective.metric.timeHorizon = timeHorizon;
      }
      if (contextNotes.trim()) {
        try {
          const parsed = JSON.parse(contextNotes.trim());
          if (initialRoadmapType === 'channel_influence') {
            objective.partnerContext = parsed;
          } else {
            objective.accountContext = parsed;
          }
        } catch {
          objective.accountContext = { notes: contextNotes.trim() };
        }
      }
      if (successDef.trim()) {
        objective.successDefinition = { dealDefinition: successDef.trim() };
      }

      const contentStrategy: ContentStrategyShape = {};
      if (tone) contentStrategy.tone = tone;
      if (channels.length > 0) contentStrategy.primaryChannels = channels;
      if (contentTypes.length > 0) contentStrategy.contentTypes = contentTypes;
      if (personalization) contentStrategy.personalizationDepth = personalization;
      if (voiceNotes.filter((n) => n.trim()).length > 0) {
        contentStrategy.voiceNotes = voiceNotes.filter((n) => n.trim());
      }

      const res = await fetch('/api/roadmap/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
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

  const sectionCls = 'rounded-lg border border-border bg-card/80 p-4 text-sm text-foreground';
  const labelCls = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block';
  const inputCls =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Sales Map &mdash; {companyName}</h1>
          <button
            type="button"
            onClick={startEditing}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Edit
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Type:</span>
          <Badge>{ROADMAP_TYPES.find((t) => t.value === initialRoadmapType)?.label ?? formatLabel(initialRoadmapType)}</Badge>
        </div>

        <section>
          <h2 className={labelCls}>Objective</h2>
          <div className={sectionCls}>
            <ObjectiveView obj={obj} />
          </div>
        </section>

        <section>
          <h2 className={labelCls}>Content Strategy</h2>
          <div className={sectionCls}>
            <ContentStrategyView strat={strat} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Edit Sales Map &mdash; {companyName}</h1>
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
            {saving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* --- Roadmap Type --- */}
      <section>
        <label htmlFor="roadmap-type" className={labelCls}>Roadmap type</label>
        <select
          id="roadmap-type"
          value={roadmapType}
          onChange={(e) => setRoadmapType(e.target.value)}
          className={inputCls}
        >
          {ROADMAP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </section>

      {/* --- Objective Fields --- */}
      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Objective</h2>

        <div>
          <label htmlFor="goal-text" className={labelCls}>Goal</label>
          <input
            id="goal-text"
            type="text"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="e.g. Land 2 new divisional use cases at General Motors this year"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-muted-foreground">Appears in the Objective Bar on the dashboard.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="metric-type" className={labelCls}>Metric</label>
            <select
              id="metric-type"
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              className={inputCls}
            >
              <option value="">Select metric...</option>
              {METRIC_TYPES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="target-count" className={labelCls}>Target count</label>
            <input
              id="target-count"
              type="number"
              min={0}
              value={targetCount || ''}
              onChange={(e) => setTargetCount(parseInt(e.target.value) || 0)}
              placeholder="e.g. 10"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="time-horizon" className={labelCls}>Time horizon</label>
            <select
              id="time-horizon"
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className={inputCls}
            >
              <option value="">Select...</option>
              {TIME_HORIZONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="context-notes" className={labelCls}>
            {roadmapType === 'channel_influence' ? 'Partner context' : 'Account context'}
          </label>
          <textarea
            id="context-notes"
            value={contextNotes}
            onChange={(e) => setContextNotes(e.target.value)}
            rows={3}
            placeholder={roadmapType === 'channel_influence'
              ? 'e.g. Primary partner, org units, territories...'
              : 'e.g. Primary account, divisions, industry...'}
            className={`${inputCls} text-xs`}
          />
          <p className="mt-1 text-xs text-muted-foreground">Free-form notes or JSON for advanced configuration.</p>
        </div>

        <div>
          <label htmlFor="success-def" className={labelCls}>Success definition</label>
          <textarea
            id="success-def"
            value={successDef}
            onChange={(e) => setSuccessDef(e.target.value)}
            rows={2}
            placeholder="What defines a successful outcome?"
            className={inputCls}
          />
        </div>
      </div>

      {/* --- Content Strategy Fields --- */}
      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Content Strategy</h2>

        <div>
          <label htmlFor="tone" className={labelCls}>Tone</label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className={inputCls}
          >
            <option value="">Select tone...</option>
            {TONE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <MultiCheckboxField
          label="Primary Channels"
          options={CHANNEL_OPTIONS}
          value={channels}
          onChange={setChannels}
        />

        <MultiCheckboxField
          label="Content Types"
          options={CONTENT_TYPE_OPTIONS}
          value={contentTypes}
          onChange={setContentTypes}
        />

        <div>
          <label htmlFor="personalization" className={labelCls}>Personalization depth</label>
          <select
            id="personalization"
            value={personalization}
            onChange={(e) => setPersonalization(e.target.value)}
            className={inputCls}
          >
            <option value="">Select...</option>
            {PERSONALIZATION_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <span className={labelCls}>Voice notes</span>
          <div className="space-y-2">
            {voiceNotes.map((note, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => {
                    const updated = [...voiceNotes];
                    updated[i] = e.target.value;
                    setVoiceNotes(updated);
                  }}
                  placeholder="e.g. Sound like a trusted partner, not an SDR"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setVoiceNotes(voiceNotes.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-red-400 hover:border-red-400/50 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setVoiceNotes([...voiceNotes, ''])}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              + Add voice note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
