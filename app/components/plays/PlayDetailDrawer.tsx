'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playRunWorkspaceUrl } from '@/lib/dashboard/my-day-navigation';
import type { PlayTemplateCatalogItem } from './PlayCatalog';

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
type DivisionOption = { id: string; label: string };

type ReadonlyStep = { order: number; name: string; phase: string };

type Props = {
  template: PlayTemplateCatalogItem;
  onClose: () => void;
  companyId?: string;
  companyName?: string;
  initialDivisionId?: string;
};

export default function PlayDetailDrawer({ template, onClose, companyId, companyName, initialDivisionId }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId || '');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [readonlySteps, setReadonlySteps] = useState<ReadonlyStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);

  const needsCompanyPicker = !companyId;

  useEffect(() => {
    setLoadingSteps(true);
    fetch(`/api/play-templates/${template.id}`)
      .then((r) => r.json())
      .then((data) => {
        const phases = data.phases ?? [];
        const stepList: ReadonlyStep[] = [];
        let order = 0;
        for (const ph of phases as Array<{ name: string; contentTemplates?: Array<{ name: string }> }>) {
          const cts = ph.contentTemplates ?? [];
          if (cts.length > 0) {
            for (const c of cts) {
              order += 1;
              stepList.push({ order, name: c.name, phase: ph.name });
            }
          } else {
            order += 1;
            stepList.push({ order, name: ph.name, phase: ph.name });
          }
        }
        setReadonlySteps(stepList);
      })
      .catch(() => setReadonlySteps([]))
      .finally(() => setLoadingSteps(false));
  }, [template.id]);

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

  const targetCompanyId = companyId || selectedCompanyId;

  useEffect(() => {
    if (!targetCompanyId) {
      setDivisions([]);
      return;
    }
    setLoadingDivisions(true);
    const preserveDivision = companyId && targetCompanyId === companyId && initialDivisionId;
    if (!preserveDivision) setSelectedDivisionId('');
    fetch(`/api/companies/${targetCompanyId}/departments`)
      .then((r) => r.json())
      .then((data) => {
        const depts = Array.isArray(data.departments) ? data.departments : Array.isArray(data) ? data : [];
        const list = depts.map((d: { id: string; customName?: string | null; type?: string }) => ({
          id: d.id,
          label: d.customName || (d.type ?? '').replace(/_/g, ' '),
        }));
        setDivisions(list);
        if (preserveDivision && list.some((d: DivisionOption) => d.id === initialDivisionId)) {
          setSelectedDivisionId(initialDivisionId!);
        }
      })
      .catch(() => setDivisions([]))
      .finally(() => setLoadingDivisions(false));
  }, [targetCompanyId, companyId, initialDivisionId]);

  const handleStart = useCallback(async () => {
    const cid = companyId || selectedCompanyId;
    if (!cid) return;
    setStarting(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        companyId: cid,
        playTemplateId: template.id,
      };
      if (selectedDivisionId) payload.targetCompanyDepartmentId = selectedDivisionId;

      const res = await fetch('/api/play-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start play');
      }
      const data = await res.json();
      const playRunId = data.playRunId ?? data.playRun?.id;
      if (playRunId) {
        router.push(playRunWorkspaceUrl(cid, playRunId));
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start play');
      setStarting(false);
    }
  }, [companyId, selectedCompanyId, selectedDivisionId, template.id, router]);

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

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <button
            type="button"
            onClick={() => setStepsExpanded((e) => !e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${t.borderMed}`,
              background: 'rgba(0,0,0,0.2)',
              color: t.text1,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <span aria-hidden style={{ fontSize: 10 }}>{stepsExpanded ? '▼' : '▶'}</span>
            View playbook steps
            {!loadingSteps && readonlySteps.length > 0 && (
              <span style={{ fontWeight: 400, color: t.text3 }}>({readonlySteps.length})</span>
            )}
          </button>

          {stepsExpanded && (
            <div style={{ marginBottom: 16 }}>
              {loadingSteps ? (
                <p style={{ fontSize: 12, color: t.text3 }}>Loading steps…</p>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 18, color: t.text3, fontSize: 12, lineHeight: 1.6 }}>
                  {readonlySteps.map((s) => (
                    <li key={s.order} style={{ marginBottom: 6 }}>
                      <span style={{ color: t.text1, fontWeight: 600 }}>{s.name}</span>
                      {s.phase !== s.name && (
                        <span style={{ color: t.text4 }}> · {s.phase}</span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {(template as { expectedOutcome?: string }).expectedOutcome && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.04)', marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text4, margin: '0 0 4px' }}>
                Expected outcome
              </p>
              <p style={{ fontSize: 11, color: t.text3, margin: 0, lineHeight: 1.5 }}>
                {(template as { expectedOutcome?: string }).expectedOutcome}
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
          {needsCompanyPicker && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text4, marginBottom: 4 }}
              >
                Target account
              </label>
              {loadingCompanies ? (
                <p style={{ fontSize: 12, color: t.text3 }}>Loading accounts…</p>
              ) : (
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: `1px solid ${t.borderMed}`, color: t.text1, fontSize: 13, outline: 'none' }}
                >
                  <option value="">Select an account…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {(targetCompanyId && !loadingDivisions && divisions.length > 0) && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text4, marginBottom: 4 }}
              >
                Division <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: `1px solid ${t.borderMed}`, color: t.text1, fontSize: 13, outline: 'none' }}
              >
                <option value="">All divisions</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: t.text4, margin: '6px 0 0' }}>
                Picking a division helps suggest contacts and scope discovery on the next screen.
              </p>
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
            {starting ? 'Starting…' : selectedCompanyName ? `Start play for ${selectedCompanyName}` : 'Start this play'}
          </button>
        </div>
      </div>
    </>
  );
}
