'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  { value: 'gift', label: 'Gift' },
  { value: 'event', label: 'Event' },
];

type StepDraft = {
  id: string;
  label: string;
  description: string;
  channel: ActivityChannel;
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
};

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
};

export default function CustomPlayBuilder({ companyId, companyName }: Props) {
  const router = useRouter();
  const [playName, setPlayName] = useState('');
  const [playDescription, setPlayDescription] = useState('');
  const [targetDivisionId, setTargetDivisionId] = useState<string>('');
  const [buyingGroups, setBuyingGroups] = useState<BuyingGroupOption[]>([]);
  const [steps, setSteps] = useState<StepDraft[]>([makeStep()]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/companies/${companyId}/departments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: BuyingGroupOption[]) => setBuyingGroups(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [companyId]);

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
      const customSteps = steps.map((s, idx) => ({
        order: idx + 1,
        label: s.label,
        description: s.description || s.label,
        channel: s.channel,
      }));

      const res = await fetch('/api/action-workflows/from-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: playName,
          description: playDescription || undefined,
          targetDivisionId: targetDivisionId || undefined,
          customSteps,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create play');
      }

      const data = await res.json();
      router.push(
        `/dashboard/companies/${companyId}/plays/execute/${data.workflowId}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create play');
      setCreating(false);
    }
  }, [playName, playDescription, steps, companyId, router]);

  const isValid = playName.trim() && steps.every((s) => s.label.trim());

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
    <div style={{ maxWidth: 600 }}>
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
            Build a Custom Play for {companyName}
          </h3>
          <p style={{ fontSize: 12, color: t.text3, margin: 0 }}>
            Define your own sequence of steps tailored to this account.
          </p>
        </div>

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
            Description (optional)
          </label>
          <input
            value={playDescription}
            onChange={(e) => setPlayDescription(e.target.value)}
            placeholder="Brief context for this play"
            style={inputStyle}
          />
        </div>

        {/* Target Buying Group */}
        {buyingGroups.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.text3, marginBottom: 4 }}>
              Target Buying Group
            </label>
            <select
              value={targetDivisionId}
              onChange={(e) => setTargetDivisionId(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              <option value="">All buying groups (no filter)</option>
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
            <p style={{ fontSize: 11, color: t.text4, marginTop: 2 }}>
              Content will be personalized for this buying group&apos;s context, contacts, and industry.
            </p>
          </div>
        )}

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
          {creating ? 'Creating...' : 'Create & Start Play'}
        </button>
      </div>
    </div>
  );
}
