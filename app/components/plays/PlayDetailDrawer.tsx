'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type TemplateStep = {
  order: number;
  name: string | null;
  label: string | null;
  description: string | null;
  channel: string | null;
  phase: string | null;
  targetPersona: string | null;
  dayOffset: number | null;
};

type PlaybookTemplate = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string | null;
  stepCount: number;
  targetDepartmentTypes: string[] | null;
  targetPersonas: string[] | null;
  expectedOutcome: string | null;
  priority: number;
  steps?: TemplateStep[];
};

const CHANNEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  email:       { label: 'Email',       color: '#60a5fa', bg: 'rgba(59,130,246,0.08)' },
  linkedin:    { label: 'LinkedIn',    color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  call:        { label: 'Call',        color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
  phone:       { label: 'Phone',       color: '#4ade80', bg: 'rgba(34,197,94,0.08)' },
  meeting:     { label: 'Meeting',     color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
  ad_brief:    { label: 'Ads',         color: '#c084fc', bg: 'rgba(192,132,252,0.08)' },
  event:       { label: 'Event',       color: '#818cf8', bg: 'rgba(99,102,241,0.08)' },
  demo:        { label: 'Demo',        color: '#fb7185', bg: 'rgba(244,63,94,0.08)' },
  proposal:    { label: 'Proposal',    color: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
  case_study:  { label: 'Case Study',  color: '#f472b6', bg: 'rgba(236,72,153,0.08)' },
  video:       { label: 'Video',       color: '#f472b6', bg: 'rgba(236,72,153,0.08)' },
  crm:         { label: 'CRM',         color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  in_product:  { label: 'In-Product',  color: '#fb923c', bg: 'rgba(249,115,22,0.08)' },
  internal:    { label: 'Internal',    color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  task:        { label: 'Task',        color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  sales_page:  { label: 'Sales Page',  color: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
  briefing:    { label: 'Briefing',    color: '#fb7185', bg: 'rgba(244,63,94,0.08)' },
  content:     { label: 'Content',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
};

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  signal:   { color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  prep:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  activate: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  engage:   { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  convert:  { color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  advocacy: { color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
};

const t = {
  surface: 'rgba(15,23,42,0.95)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
};

type CompanyOption = { id: string; name: string };

type Props = {
  template: PlaybookTemplate;
  onClose: () => void;
  companyId?: string;
  companyName?: string;
};

export default function PlayDetailDrawer({ template, onClose, companyId, companyName }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<TemplateStep[]>(template.steps ?? []);
  const [loadingSteps, setLoadingSteps] = useState(!template.steps?.length);

  const needsCompanyPicker = !companyId;

  useEffect(() => {
    if (template.steps?.length) return;
    setLoadingSteps(true);
    fetch(`/api/playbooks/templates/${template.id}`)
      .then((r) => r.json())
      .then((data) => setSteps(data.template?.steps ?? []))
      .catch(() => {})
      .finally(() => setLoadingSteps(false));
  }, [template.id, template.steps]);

  useEffect(() => {
    if (!needsCompanyPicker) return;
    setLoadingCompanies(true);
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data) => {
        const list = (data.companies || data || []).map(
          (c: { id: string; name: string }) => ({ id: c.id, name: c.name }),
        );
        setCompanies(list);
      })
      .finally(() => setLoadingCompanies(false));
  }, [needsCompanyPicker]);

  const handleStart = useCallback(async () => {
    const targetCompanyId = companyId || selectedCompanyId;
    if (!targetCompanyId) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/action-workflows/from-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: targetCompanyId,
          templateId: template.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start play');
      }
      const data = await res.json();
      router.push(
        `/dashboard/companies/${targetCompanyId}/plays/execute/${data.workflowId}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start play');
      setStarting(false);
    }
  }, [companyId, selectedCompanyId, template.id, router]);

  const selectedCompanyName =
    companyName || companies.find((c) => c.id === selectedCompanyId)?.name;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }}
      />

      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 480, maxWidth: '100vw',
          background: t.surface, borderLeft: `1px solid ${t.borderMed}`,
          backdropFilter: 'blur(20px)', zIndex: 51,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span
                style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 4, background: t.blueBg, color: t.blue,
                }}
              >
                {template.triggerType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Manual'}
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text1, margin: '8px 0 0' }}>
                {template.name}
              </h2>
              <p style={{ fontSize: 13, color: t.text3, margin: '4px 0 0' }}>
                {template.description ?? ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.borderMed}`,
                color: t.text3, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              x
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: t.text4, marginBottom: 12,
              }}
            >
              Steps ({steps.length})
            </h3>

            {loadingSteps ? (
              <p style={{ fontSize: 12, color: t.text3 }}>Loading steps...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {steps.map((step, idx) => {
                  const chCfg = step.channel ? CHANNEL_CONFIG[step.channel] : null;
                  const phCfg = step.phase ? PHASE_COLORS[step.phase] : null;
                  const isLast = idx === steps.length - 1;
                  return (
                    <div key={step.order} style={{ display: 'flex', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                            background: phCfg?.bg ?? t.blueBg,
                            color: phCfg?.color ?? t.blue,
                            border: `1px solid ${t.blueBorder}`,
                          }}
                        >
                          {step.order}
                        </div>
                        {!isLast && (
                          <div style={{ width: 1, flex: 1, background: t.borderMed, minHeight: 12 }} />
                        )}
                      </div>

                      <div style={{ paddingBottom: isLast ? 0 : 14, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>
                            {step.name ?? step.label ?? `Step ${step.order}`}
                          </span>
                          {chCfg && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: chCfg.bg, color: chCfg.color }}>
                              {chCfg.label}
                            </span>
                          )}
                          {step.phase && phCfg && (
                            <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: phCfg.bg, color: phCfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {step.phase}
                            </span>
                          )}
                          {step.dayOffset != null && (
                            <span style={{ fontSize: 10, color: t.text4 }}>Day {step.dayOffset}</span>
                          )}
                        </div>
                        {step.targetPersona && (
                          <p style={{ fontSize: 11, color: t.text4, margin: '1px 0 0' }}>
                            Target: {step.targetPersona}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: t.text3, margin: '2px 0 0' }}>
                          {step.description ?? ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {template.expectedOutcome && (
              <MetaBlock label="Expected Outcome" value={template.expectedOutcome} />
            )}
            {template.targetPersonas && (template.targetPersonas as string[]).length > 0 && (
              <MetaBlock label="Target Personas" value={(template.targetPersonas as string[]).join(', ')} />
            )}
            {template.targetDepartmentTypes && (template.targetDepartmentTypes as string[]).length > 0 && (
              <MetaBlock label="Departments" value={(template.targetDepartmentTypes as string[]).map((d) => d.replace(/_/g, ' ')).join(', ')} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
          {needsCompanyPicker && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text4, marginBottom: 4 }}
              >
                Target Account
              </label>
              {loadingCompanies ? (
                <p style={{ fontSize: 12, color: t.text3 }}>Loading accounts...</p>
              ) : (
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: `1px solid ${t.borderMed}`, color: t.text1, fontSize: 13, outline: 'none' }}
                >
                  <option value="">Select an account...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {companyName && (
            <p style={{ fontSize: 12, color: t.text3, marginBottom: 8 }}>
              Starting for <strong style={{ color: t.text1 }}>{companyName}</strong>
            </p>
          )}

          {error && (
            <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{error}</p>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={starting || (!companyId && !selectedCompanyId)}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 10,
              background: starting || (!companyId && !selectedCompanyId) ? 'rgba(59,130,246,0.15)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: starting || (!companyId && !selectedCompanyId) ? 'not-allowed' : 'pointer',
              opacity: starting ? 0.7 : 1,
              boxShadow: starting || (!companyId && !selectedCompanyId) ? 'none' : '0 4px 20px rgba(59,130,246,0.3)',
            }}
          >
            {starting ? 'Starting...' : selectedCompanyName ? `Start Play for ${selectedCompanyName}` : 'Start this Play'}
          </button>
        </div>
      </div>
    </>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  );
}
