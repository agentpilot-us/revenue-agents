'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCategory, PlayContentType, PlayScope, PlayTemplateStatus, PlayTriggerType, PhaseGateType } from '@prisma/client';
import { playRunWorkspaceUrl } from '@/lib/dashboard/my-day-navigation';
import type { ActivityChannel } from '@/lib/types/channels';

type BuyingGroupOption = {
  id: string;
  customName: string | null;
  type: string;
  industry: string | null;
};

const CHANNELS: { value: ActivityChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'briefing', label: 'Briefing' },
  { value: 'content', label: 'Content' },
  { value: 'sales_page', label: 'Sales Page' },
  { value: 'video', label: 'Video' },
  { value: 'demo', label: 'Demo' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'gift', label: 'Gift' },
  { value: 'event', label: 'Event' },
  { value: 'task', label: 'Task' },
];

type StepDraft = {
  id: string;
  label: string;
  description: string;
  channel: ActivityChannel;
  contentIntent?: string;
  contentType?: string;
  sellingMotion?: string;
};

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  red: '#ef4444',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.25)',
  purple: '#a855f7',
  purpleBg: 'rgba(168,85,247,0.08)',
  purpleBorder: 'rgba(168,85,247,0.25)',
};

function activityChannelToPlayContentType(ch: ActivityChannel): PlayContentType {
  switch (ch) {
    case 'email':
      return PlayContentType.EMAIL;
    case 'linkedin':
      return PlayContentType.LINKEDIN_MSG;
    default:
      return PlayContentType.BRIEF;
  }
}

let nextStepId = 1;
function makeStep(partial?: Partial<StepDraft>): StepDraft {
  return {
    id: `step_${nextStepId++}`,
    label: '',
    description: '',
    channel: 'email',
    ...partial,
  };
}

type Props = {
  companyId: string;
  companyName: string;
  initialDivisionId?: string;
  /** When custom create is disabled, call to switch to Play Catalog tab. */
  onSwitchToCatalog?: () => void;
};

type AISuggestion = {
  playName: string;
  playDescription: string;
  steps: Array<{
    label: string;
    description: string;
    channel: string;
    contentIntent?: string;
    contentType?: string;
    sellingMotion?: string;
    dayOffset: number;
  }>;
  reasoning: string;
};

type ObjectiveSuggestion = {
  playTemplateId: string;
  playTemplateName: string;
  phases: Array<{ name: string; steps: Array<{ name: string; contentGenerationType?: string }> }>;
  roadmapTargetId: string | null;
  productId: string | null;
  objectiveText: string;
  matched: boolean;
};

export default function CustomPlayBuilder({ companyId, companyName, initialDivisionId, onSwitchToCatalog }: Props) {
  const router = useRouter();
  const [targetDivisionId, setTargetDivisionId] = useState<string>(initialDivisionId ?? '');
  const [buyingGroups, setBuyingGroups] = useState<BuyingGroupOption[]>([]);

  // AI suggestion phase
  const [objective, setObjective] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [objectiveSuggestion, setObjectiveSuggestion] = useState<ObjectiveSuggestion | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [creatingFromObjective, setCreatingFromObjective] = useState(false);

  // Play builder phase (manual or post-AI edit)
  const [playName, setPlayName] = useState('');
  const [playDescription, setPlayDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([makeStep()]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // When true, user skipped AI and is building manually
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    fetch(`/api/companies/${companyId}/departments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: BuyingGroupOption[]) => setBuyingGroups(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [companyId]);

  const handleSuggest = useCallback(async () => {
    if (!objective.trim()) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestion(null);
    setObjectiveSuggestion(null);

    try {
      const res = await fetch('/api/play-runs/suggest-from-objective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectiveText: objective.trim(),
          companyId,
          roadmapTargetId: null,
          roadmapId: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to suggest plan');
      }

      const data = await res.json();
      if (data.playTemplateId) {
        setObjectiveSuggestion({
          playTemplateId: data.playTemplateId,
          playTemplateName: data.playTemplateName,
          phases: data.phases ?? [],
          roadmapTargetId: data.roadmapTargetId ?? null,
          productId: data.productId ?? null,
          objectiveText: data.objectiveText ?? objective.trim(),
          matched: data.matched ?? true,
        });
        return;
      }

      const planRes = await fetch(
        `/api/companies/${companyId}/departments/${targetDivisionId}/suggest-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objective: objective.trim() }),
        },
      );
      if (!planRes.ok) {
        const planData = await planRes.json();
        throw new Error(planData.error || 'Failed to generate plan');
      }
      const planData: AISuggestion = await planRes.json();
      setSuggestion(planData);
      setPlayName(planData.playName);
      setPlayDescription(planData.playDescription);
      setSteps(
        planData.steps.map((s) =>
          makeStep({
            label: s.label,
            description: s.description,
            channel: (CHANNELS.find((c) => c.value === s.channel)?.value ?? 'email') as ActivityChannel,
            contentIntent: s.contentIntent || 'introduction',
            contentType: s.contentType || undefined,
            sellingMotion: s.sellingMotion || undefined,
          }),
        ),
      );
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setSuggesting(false);
    }
  }, [objective, targetDivisionId, companyId]);

  const handleCreateFromObjective = useCallback(async () => {
    if (!objectiveSuggestion?.playTemplateId) return;
    setCreatingFromObjective(true);
    setError(null);
    try {
      const res = await fetch('/api/play-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          playTemplateId: objectiveSuggestion.playTemplateId,
          roadmapTargetId: objectiveSuggestion.roadmapTargetId,
          productId: objectiveSuggestion.productId,
          triggerType: 'OBJECTIVE',
          triggerContext: { objectiveText: objectiveSuggestion.objectiveText },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create run');
      }
      const data = await res.json();
      const runId = data.playRunId ?? data.playRun?.id;
      if (runId) {
        router.push(playRunWorkspaceUrl(companyId, runId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run');
    } finally {
      setCreatingFromObjective(false);
    }
  }, [objectiveSuggestion, companyId, router]);

  const addStep = () => setSteps((prev) => [...prev, makeStep()]);

  const removeStep = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const updateStep = (id: string, field: keyof StepDraft, value: string) =>
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleCreate = useCallback(async () => {
    if (!playName.trim()) return;
    if (steps.some((s) => !s.label.trim())) return;
    setCreating(true);
    setError(null);

    try {
      const status =
        publishImmediately ? PlayTemplateStatus.ACTIVE : PlayTemplateStatus.DRAFT;
      const phases = steps.map((s, i) => ({
        orderIndex: i,
        name: s.label.trim() || `Step ${i + 1}`,
        description: s.description?.trim() || null,
        offsetDays: null as number | null,
        gateType: PhaseGateType.MANUAL,
        gateConfig: null as Record<string, unknown> | null,
        uiPhaseKind: null as string | null,
        steps: [
          {
            orderIndex: 0,
            name: s.label.trim(),
            contentType: activityChannelToPlayContentType(s.channel),
            channel: null,
            contentGenerationType: 'custom_content',
            requiresContact: s.channel === 'email' || s.channel === 'linkedin',
            isAutomatable: false,
            promptMode: 'simple' as const,
            promptHint:
              [s.description?.trim(), s.label.trim()].filter(Boolean).join('\n\n') || s.label.trim(),
            rawPromptTemplate: null,
            systemInstructions: null,
            governanceRules: null,
          },
        ],
      }));

      const res = await fetch('/api/play-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playName.trim(),
          description: playDescription.trim() || null,
          slug: null,
          scope: PlayScope.ACCOUNT,
          category: PlayCategory.ENGAGEMENT,
          triggerType: PlayTriggerType.MANUAL,
          signalTypes: [],
          defaultAutonomyLevel: null,
          status,
          phases,
          companyId,
          activateForCompany: status === PlayTemplateStatus.ACTIVE ? true : undefined,
          source: 'builder_v1',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save play template');
      }
      const newId = data.template?.id;
      if (newId) {
        router.push(`/dashboard/my-company/play-templates/${newId}/edit`);
        return;
      }
      onSwitchToCatalog?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create play');
    } finally {
      setCreating(false);
    }
  }, [
    playName,
    playDescription,
    steps,
    companyId,
    router,
    onSwitchToCatalog,
    publishImmediately,
  ]);

  const isValid = playName.trim() && steps.every((s) => s.label.trim());
  const showBuilder = manualMode || suggestion;
  const showObjectiveMatch = objectiveSuggestion != null;
  const selectedGroup = buyingGroups.find((bg) => bg.id === targetDivisionId);

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.2)',
    border: `1px solid ${t.borderMed}`,
    color: t.text1,
    fontSize: 13,
    outline: 'none',
    width: '100%' as const,
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: t.surface,
          border: `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text1, margin: '0 0 4px' }}>
            Build a Play for {companyName}
          </h3>
          <p style={{ fontSize: 12, color: t.text3, margin: 0 }}>
            {showBuilder
              ? 'Review and edit the steps below, then create the play.'
              : 'Tell us your objective and we\'ll suggest a plan — or build one manually.'}
          </p>
        </div>

        {/* Target Buying Group — always shown */}
        {buyingGroups.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 4 }}>
              Target Buying Group *
            </label>
            <select
              value={targetDivisionId}
              onChange={(e) => setTargetDivisionId(e.target.value)}
              disabled={!!suggestion}
              style={{
                ...inputStyle,
                cursor: suggestion ? 'default' : 'pointer',
                opacity: suggestion ? 0.6 : 1,
              }}
            >
              <option value="">Select a buying group</option>
              {buyingGroups.map((bg) => {
                const label = bg.customName || bg.type.replace(/_/g, ' ');
                const suffix = bg.industry ? ` — ${bg.industry}` : '';
                return (
                  <option key={bg.id} value={bg.id}>
                    {label}{suffix}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Phase 1: Objective input + AI suggest */}
        {!showBuilder && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 4 }}>
                What&apos;s your objective?
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Get a champion demo with the Automotive SEs team, then convert them into a design partner for our platform"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical' as const,
                  fontFamily: 'inherit',
                }}
              />
              <p style={{ fontSize: 11, color: t.text4, marginTop: 2 }}>
                AI will analyze the buying group, your content library, and strategic account plan to suggest steps.
              </p>
            </div>

            {suggestError && (
              <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{suggestError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting || !objective.trim()}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 10,
                  background: suggesting || !objective.trim() || !targetDivisionId
                    ? 'rgba(168,85,247,0.15)'
                    : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: suggesting || !objective.trim() ? 'not-allowed' : 'pointer',
                  opacity: suggesting ? 0.7 : 1,
                  boxShadow: suggesting || !objective.trim()
                    ? 'none'
                    : '0 4px 20px rgba(168,85,247,0.3)',
                }}
              >
                {suggesting ? 'Thinking...' : 'Suggest a Plan with AI'}
              </button>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: `1px solid ${t.borderMed}`,
                  color: t.text2,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Build Manually
              </button>
            </div>
          </>
        )}

        {/* Matched play from objective — create run */}
        {showObjectiveMatch && objectiveSuggestion && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: t.greenBg,
              border: `1px solid ${t.greenBorder}`,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: t.green, margin: '0 0 6px' }}>
              {objectiveSuggestion.matched ? 'Matched play' : 'Suggested plan'}
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: t.text1, margin: '0 0 8px' }}>
              {objectiveSuggestion.playTemplateName}
            </p>
            <p style={{ fontSize: 11, color: t.text3, margin: '0 0 8px' }}>
              {objectiveSuggestion.phases.length} phase(s),{' '}
              {objectiveSuggestion.phases.reduce((n, ph) => n + ph.steps.length, 0)} steps
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                disabled={creatingFromObjective}
                onClick={handleCreateFromObjective}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: t.green,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: creatingFromObjective ? 'not-allowed' : 'pointer',
                }}
              >
                {creatingFromObjective ? 'Creating…' : 'Create run'}
              </button>
              <button
                type="button"
                onClick={() => setObjectiveSuggestion(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${t.borderMed}`,
                  color: t.text2,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Choose different plan
              </button>
            </div>
          </div>
        )}

        {/* AI reasoning callout */}
        {suggestion && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: t.purpleBg,
              border: `1px solid ${t.purpleBorder}`,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, color: t.purple, margin: '0 0 4px' }}>
              AI Reasoning
            </p>
            <p style={{ fontSize: 12, color: t.text2, margin: 0, lineHeight: 1.5 }}>
              {suggestion.reasoning}
            </p>
            <button
              type="button"
              onClick={() => {
                setSuggestion(null);
                setManualMode(false);
                setPlayName('');
                setPlayDescription('');
                setSteps([makeStep()]);
              }}
              style={{
                marginTop: 8,
                padding: '4px 10px',
                borderRadius: 4,
                background: 'transparent',
                border: `1px solid ${t.purpleBorder}`,
                color: t.purple,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Start Over
            </button>
          </div>
        )}

        {/* Phase 2: Play builder (manual or AI-populated) */}
        {showBuilder && (
          <>
            {/* Play name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 4 }}>
                Play Name *
              </label>
              <input
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                placeholder="e.g. In-person GM visit — NYC Q1"
                style={inputStyle}
              />
            </div>

            {/* Play description */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 4 }}>
                Description
              </label>
              <input
                value={playDescription}
                onChange={(e) => setPlayDescription(e.target.value)}
                placeholder="Brief context for this play"
                style={inputStyle}
              />
            </div>

            {/* Steps */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 8 }}>
                Steps ({steps.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.15)',
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          background: t.blueBg,
                          color: t.blue,
                          border: `1px solid ${t.blueBorder}`,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>

                      <input
                        value={step.label}
                        onChange={(e) => updateStep(step.id, 'label', e.target.value)}
                        placeholder="Step label (e.g. Send invite email)"
                        style={{ ...inputStyle, flex: 1 }}
                      />

                      <select
                        value={step.channel}
                        onChange={(e) => updateStep(step.id, 'channel', e.target.value)}
                        style={{
                          ...inputStyle,
                          width: 120,
                          cursor: 'pointer',
                        }}
                      >
                        {CHANNELS.map((ch) => (
                          <option key={ch.value} value={ch.value}>
                            {ch.label}
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          style={{
                            width: 22, height: 22, borderRadius: 4,
                            background: 'transparent', border: `1px solid ${t.borderMed}`,
                            color: idx === 0 ? t.text4 : t.text2,
                            cursor: idx === 0 ? 'default' : 'pointer',
                            fontSize: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === steps.length - 1}
                          style={{
                            width: 22, height: 22, borderRadius: 4,
                            background: 'transparent', border: `1px solid ${t.borderMed}`,
                            color: idx === steps.length - 1 ? t.text4 : t.text2,
                            cursor: idx === steps.length - 1 ? 'default' : 'pointer',
                            fontSize: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          disabled={steps.length <= 1}
                          style={{
                            width: 22, height: 22, borderRadius: 4,
                            background: 'transparent', border: `1px solid ${t.borderMed}`,
                            color: steps.length <= 1 ? t.text4 : t.red,
                            cursor: steps.length <= 1 ? 'default' : 'pointer',
                            fontSize: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <input
                      value={step.description}
                      onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                      placeholder="Description (optional — used as content generation hint)"
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addStep}
                style={{
                  marginTop: 8,
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: `1px dashed ${t.borderMed}`,
                  color: t.text3,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                + Add step
              </button>
            </div>

            {error && <p style={{ fontSize: 12, color: t.red }}>{error}</p>}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: t.text2 }}>
              <input
                type="checkbox"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
              />
              Publish immediately (ACTIVE) and activate for this account if a Strategic Account Plan exists
            </label>

            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !isValid}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: creating || !isValid ? 'rgba(59,130,246,0.15)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: creating || !isValid ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.7 : 1,
                boxShadow: creating || !isValid ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
              }}
            >
              {creating ? 'Saving…' : publishImmediately ? 'Publish & open in editor' : 'Save template (open in editor)'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
