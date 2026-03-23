'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlayCategory,
  PlayContentType,
  PlayScope,
  PlayTemplateStatus,
  PlayTriggerType,
  PhaseGateType,
  ContentChannel,
} from '@prisma/client';
import { CONTENT_GENERATION_TYPE_KEYS } from '@/lib/plays/content-generation-types';

const PHASE_UI_KINDS = ['Outreach', 'Follow-up', 'Research', 'Internal'] as const;

const AUTONOMY_OPTIONS = [
  { value: '', label: 'Default (Draft + Review)' },
  { value: 'NOTIFY_ONLY', label: 'Notify Only' },
  { value: 'DRAFT_REVIEW', label: 'Draft + Review' },
  { value: 'AUTO_EXECUTE', label: 'Auto-Execute' },
];

function randomKey() {
  return `p_${Math.random().toString(36).slice(2, 11)}`;
}

type StepDraft = {
  name: string;
  contentType: PlayContentType;
  channel: string;
  contentGenerationType: string;
  requiresContact: boolean;
  isAutomatable: boolean;
  promptMode: 'simple' | 'advanced';
  promptHint: string;
  rawPromptTemplate: string;
  systemInstructions: string;
  governanceRules: string;
};

export type PhaseDraft = {
  localKey: string;
  name: string;
  description: string;
  offsetDays: string;
  uiPhaseKind: string;
  gateType: PhaseGateType;
  step: StepDraft;
};

const defaultStep = (): StepDraft => ({
  name: '',
  contentType: PlayContentType.EMAIL,
  channel: '',
  contentGenerationType: 'custom_content',
  requiresContact: true,
  isAutomatable: false,
  promptMode: 'simple',
  promptHint: '',
  rawPromptTemplate: '',
  systemInstructions: '',
  governanceRules: '',
});

const defaultPhase = (): PhaseDraft => ({
  localKey: randomKey(),
  name: '',
  description: '',
  offsetDays: '',
  uiPhaseKind: '',
  gateType: PhaseGateType.MANUAL,
  step: defaultStep(),
});

export type PlayTemplateBuilderProps = {
  mode: 'create' | 'edit';
  templateId?: string;
  context?: {
    companyId?: string;
    companyName?: string;
    returnTo?: string;
  };
};

export default function PlayTemplateBuilder({ mode, templateId, context }: PlayTemplateBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structuralBlocked, setStructuralBlocked] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [scope, setScope] = useState<PlayScope>(PlayScope.COMPANY);
  const [category, setCategory] = useState<PlayCategory>(PlayCategory.ENGAGEMENT);
  const [triggerType, setTriggerType] = useState<PlayTriggerType>(PlayTriggerType.MANUAL);
  const [anchorField, setAnchorField] = useState('');
  const [anchorOffsetDays, setAnchorOffsetDays] = useState('');
  const [defaultAutonomyLevel, setDefaultAutonomyLevel] = useState('');
  const [signalTypes] = useState<string[]>([]);
  const [phases, setPhases] = useState<PhaseDraft[]>([defaultPhase()]);
  const [activateForCompany, setActivateForCompany] = useState(!!context?.companyId);

  const companyId = context?.companyId?.trim();
  const companyName = context?.companyName?.trim();
  const returnTo =
    context?.returnTo?.trim() || '/dashboard/my-company?tab=Playbooks';

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/play-templates/${templateId}`);
      if (!res.ok) {
        throw new Error('Failed to load template');
      }
      const data = await res.json();
      const t = data.template;
      setName(t.name ?? '');
      setDescription(t.description ?? '');
      setSlug(t.slug ?? '');
      setScope(t.scope ?? PlayScope.COMPANY);
      setCategory(t.category ?? PlayCategory.ENGAGEMENT);
      setTriggerType(t.triggerType ?? PlayTriggerType.MANUAL);
      setAnchorField(t.anchorField ?? '');
      setAnchorOffsetDays(t.anchorOffsetDays != null ? String(t.anchorOffsetDays) : '');
      setDefaultAutonomyLevel(t.defaultAutonomyLevel ?? '');

      const phs: PhaseDraft[] = (data.phases ?? []).map(
        (p: {
          name: string;
          description?: string | null;
          offsetDays?: number | null;
          uiPhaseKind?: string | null;
          gateType?: PhaseGateType;
          contentTemplates?: Array<{
            name: string;
            contentType: PlayContentType;
            channel?: ContentChannel | null;
            contentGenerationType?: string;
            requiresContact?: boolean;
            isAutomatable?: boolean;
            promptMode?: 'simple' | 'advanced';
            promptHint?: string;
            rawPromptTemplate?: string;
            systemInstructions?: string | null;
            governanceRules?: string | null;
          }>;
        }) => {
          const c = p.contentTemplates?.[0];
          return {
            localKey: randomKey(),
            name: p.name,
            description: p.description ?? '',
            offsetDays: p.offsetDays != null ? String(p.offsetDays) : '',
            uiPhaseKind: p.uiPhaseKind ?? '',
            gateType: p.gateType ?? PhaseGateType.MANUAL,
            step: {
              name: c?.name ?? '',
              contentType: c?.contentType ?? PlayContentType.EMAIL,
              channel: c?.channel ?? '',
              contentGenerationType: c?.contentGenerationType ?? 'custom_content',
              requiresContact: c?.requiresContact ?? false,
              isAutomatable: c?.isAutomatable ?? false,
              promptMode: c?.promptMode ?? 'simple',
              promptHint: c?.promptHint ?? '',
              rawPromptTemplate: c?.rawPromptTemplate ?? '',
              systemInstructions: c?.systemInstructions ?? '',
              governanceRules: c?.governanceRules ?? '',
            },
          };
        },
      );
      if (phs.length) setPhases(phs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (mode === 'edit' && templateId) {
      loadTemplate();
    }
  }, [mode, templateId, loadTemplate]);

  const buildBody = useCallback(
    (status: PlayTemplateStatus) => {
      const offsetParsed = anchorOffsetDays.trim() === '' ? null : parseInt(anchorOffsetDays, 10);
      return {
        name: name.trim(),
        description: description.trim() || null,
        slug: slug.trim() || null,
        scope,
        category,
        triggerType,
        signalTypes,
        anchorField: triggerType === PlayTriggerType.TIMELINE ? anchorField.trim() || null : null,
        anchorOffsetDays:
          triggerType === PlayTriggerType.TIMELINE && offsetParsed != null && !Number.isNaN(offsetParsed) ?
            offsetParsed
          : null,
        defaultAutonomyLevel: defaultAutonomyLevel || null,
        status,
        phases: phases.map((ph, i) => ({
          orderIndex: i,
          name: ph.name.trim(),
          description: ph.description.trim() || null,
          offsetDays:
            ph.offsetDays.trim() === '' ? null : parseInt(ph.offsetDays, 10) || null,
          gateType: ph.gateType,
          gateConfig: null,
          uiPhaseKind: ph.uiPhaseKind.trim() || null,
          steps: [
            {
              orderIndex: 0,
              name: ph.step.name.trim(),
              contentType: ph.step.contentType,
              channel: ph.step.channel ? (ph.step.channel as ContentChannel) : null,
              contentGenerationType: ph.step.contentGenerationType,
              requiresContact: ph.step.requiresContact,
              isAutomatable: ph.step.isAutomatable,
              promptMode: ph.step.promptMode,
              promptHint: ph.step.promptHint,
              rawPromptTemplate: ph.step.rawPromptTemplate,
              systemInstructions: ph.step.systemInstructions.trim() || null,
              governanceRules: ph.step.governanceRules.trim() || null,
            },
          ],
        })),
        companyId: companyId || null,
        activateForCompany:
          status === PlayTemplateStatus.ACTIVE && companyId ? activateForCompany : undefined,
        source: 'builder_v1',
      };
    },
    [
      name,
      description,
      slug,
      scope,
      category,
      triggerType,
      signalTypes,
      anchorField,
      anchorOffsetDays,
      defaultAutonomyLevel,
      phases,
      companyId,
      activateForCompany,
    ],
  );

  const validate = useCallback(
    (status: PlayTemplateStatus) => {
      if (!name.trim()) return 'Name is required';
      if (triggerType === PlayTriggerType.TIMELINE) {
        if (!anchorField.trim()) return 'Timeline plays require an anchor field';
        if (anchorOffsetDays.trim() === '' || Number.isNaN(parseInt(anchorOffsetDays, 10))) {
          return 'Timeline plays require anchor offset (days)';
        }
      }
      if (!phases.length) return 'Add at least one phase';
      for (const ph of phases) {
        if (!ph.name.trim()) return 'Each phase needs a name';
        if (!ph.step.name.trim()) return 'Each phase needs a step name';
        if (ph.step.promptMode === 'simple' && !ph.step.promptHint.trim()) {
          return 'Each step needs a prompt hint (or switch to Advanced)';
        }
        if (ph.step.promptMode === 'advanced' && !ph.step.rawPromptTemplate.trim()) {
          return 'Advanced mode requires a full prompt template';
        }
      }
      if (status === PlayTemplateStatus.ACTIVE && companyId && activateForCompany) {
        // Server validates roadmap; nothing client-only
      }
      return null;
    },
    [name, triggerType, anchorField, anchorOffsetDays, phases, companyId, activateForCompany],
  );

  const save = async (status: PlayTemplateStatus) => {
    const v = validate(status);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    setStructuralBlocked(false);
    try {
      const body = buildBody(status);
      const url =
        mode === 'edit' && templateId ?
          `/api/play-templates/${templateId}`
        : '/api/play-templates';
      const res = await fetch(url, {
        method: mode === 'edit' && templateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        if (data.code === 'STRUCTURAL_EDIT_BLOCKED') {
          setStructuralBlocked(true);
          setError(data.error ?? 'Structural edits are blocked for templates with active runs.');
        } else {
          setError(data.error ?? 'Conflict');
        }
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Save failed');
      }
      if (mode === 'create') {
        const newId = data.template?.id;
        if (newId) {
          router.push(`/dashboard/my-company/play-templates/${newId}/edit`);
          return;
        }
      }
      if (mode === 'edit') {
        router.refresh();
        await loadTemplate();
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!templateId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/play-templates/${templateId}/clone`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clone failed');
      router.push(`/dashboard/my-company/play-templates/${data.templateId}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clone failed');
    } finally {
      setSaving(false);
    }
  };

  const movePhase = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= phases.length) return;
    setPhases((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const updatePhase = (index: number, patch: Partial<PhaseDraft>) => {
    setPhases((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setPhases((prev) =>
      prev.map((p, i) => (i === index ? { ...p, step: { ...p.step, ...patch } } : p)),
    );
  };

  const playCategories = useMemo(() => Object.values(PlayCategory), []);
  const playContentTypes = useMemo(() => Object.values(PlayContentType), []);
  const contentChannels = useMemo(() => ['', ...Object.values(ContentChannel)], []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground">Loading template…</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href={returnTo}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold mt-2">
            {mode === 'create' ? 'Create play template' : 'Edit play template'}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={saving}
            onClick={() => save(PlayTemplateStatus.DRAFT)}
            className="px-4 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(PlayTemplateStatus.ACTIVE)}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {companyId && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={activateForCompany}
            onChange={(e) => setActivateForCompany(e.target.checked)}
          />
          <span>
            Activate for {companyName || 'this account'} (requires a Strategic Account Plan)
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          {structuralBlocked && templateId && (
            <button
              type="button"
              className="block mt-2 text-primary underline"
              onClick={handleClone}
              disabled={saving}
            >
              Duplicate as new template
            </button>
          )}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Template</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Name *</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[72px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {mode === 'edit' && (
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Slug</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-xs"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Scope</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as PlayScope)}
            >
              {Object.values(PlayScope).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as PlayCategory)}
            >
              {playCategories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Trigger</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as PlayTriggerType)}
            >
              {Object.values(PlayTriggerType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Default autonomy</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={defaultAutonomyLevel}
              onChange={(e) => setDefaultAutonomyLevel(e.target.value)}
            >
              {AUTONOMY_OPTIONS.map((o) => (
                <option key={o.value || 'default'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {triggerType === PlayTriggerType.TIMELINE && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Anchor field</label>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. contractEndDate"
                  value={anchorField}
                  onChange={(e) => setAnchorField(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Anchor offset (days)</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={anchorOffsetDays}
                  onChange={(e) => setAnchorOffsetDays(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Phases (one step each)</h2>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setPhases((p) => [...p, defaultPhase()])}
          >
            + Add phase
          </button>
        </div>
        {phases.map((ph, idx) => (
          <div
            key={ph.localKey}
            className="rounded-lg border border-border bg-card/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Phase {idx + 1}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/50"
                  onClick={() => movePhase(idx, -1)}
                  disabled={idx === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/50"
                  onClick={() => movePhase(idx, 1)}
                  disabled={idx === phases.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    setPhases((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))
                  }
                  disabled={phases.length <= 1}
                >
                  Remove
                </button>
              </div>
            </div>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Phase name *"
              value={ph.name}
              onChange={(e) => updatePhase(idx, { name: e.target.value })}
            />
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[48px]"
              placeholder="Phase description (optional)"
              value={ph.description}
              onChange={(e) => updatePhase(idx, { description: e.target.value })}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Offset days (optional)</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={ph.offsetDays}
                  onChange={(e) => updatePhase(idx, { offsetDays: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phase kind (optional)</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={ph.uiPhaseKind}
                  onChange={(e) => updatePhase(idx, { uiPhaseKind: e.target.value })}
                >
                  <option value="">—</option>
                  {PHASE_UI_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Step</p>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Step name *"
                value={ph.step.name}
                onChange={(e) => updateStep(idx, { name: e.target.value })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Content type</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={ph.step.contentType}
                    onChange={(e) =>
                      updateStep(idx, { contentType: e.target.value as PlayContentType })
                    }
                  >
                    {playContentTypes.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Channel (optional)</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={ph.step.channel}
                    onChange={(e) => updateStep(idx, { channel: e.target.value })}
                  >
                    {contentChannels.map((ch) => (
                      <option key={ch || 'none'} value={ch}>
                        {ch || '— Auto —'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Content generation type</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={ph.step.contentGenerationType}
                    onChange={(e) => updateStep(idx, { contentGenerationType: e.target.value })}
                  >
                    {CONTENT_GENERATION_TYPE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={ph.step.requiresContact}
                  onChange={(e) => updateStep(idx, { requiresContact: e.target.checked })}
                />
                Requires contact
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={ph.step.isAutomatable}
                  onChange={(e) => updateStep(idx, { isAutomatable: e.target.checked })}
                />
                Automatable
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={ph.step.promptMode === 'advanced'}
                  onChange={(e) =>
                    updateStep(idx, { promptMode: e.target.checked ? 'advanced' : 'simple' })
                  }
                />
                Advanced prompt (full template)
              </label>
              {ph.step.promptMode === 'simple' ? (
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Prompt hint * — what should this step accomplish?"
                  value={ph.step.promptHint}
                  onChange={(e) => updateStep(idx, { promptHint: e.target.value })}
                />
              ) : (
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[120px] font-mono text-xs"
                  placeholder="Full prompt template *"
                  value={ph.step.rawPromptTemplate}
                  onChange={(e) => updateStep(idx, { rawPromptTemplate: e.target.value })}
                />
              )}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Advanced fields</summary>
                <div className="mt-2 space-y-2">
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="System instructions"
                    value={ph.step.systemInstructions}
                    onChange={(e) => updateStep(idx, { systemInstructions: e.target.value })}
                  />
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Governance rules"
                    value={ph.step.governanceRules}
                    onChange={(e) => updateStep(idx, { governanceRules: e.target.value })}
                  />
                </div>
              </details>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
