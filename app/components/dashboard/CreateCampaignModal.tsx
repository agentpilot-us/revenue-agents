'use client';

import { useState, useEffect, useCallback } from 'react';

const t = {
  surface: 'rgba(15,23,42,0.95)',
  border: 'rgba(255,255,255,0.08)',
  borderMed: 'rgba(255,255,255,0.12)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
  green: '#22c55e',
  greenBg: 'rgba(34,197,94,0.06)',
  greenBorder: 'rgba(34,197,94,0.2)',
};

type Template = {
  id: string;
  name: string;
  triggerType: string;
  description: string | null;
  phaseCount?: number;
  _count?: { steps: number };
};

type Division = {
  id: string;
  name: string;
  type: string;
  contactCount: number;
};

type Company = {
  id: string;
  name: string;
  departments: Division[];
};

type Props = {
  companies: Company[];
  onClose: () => void;
  onCreated: () => void;
};

const MOTIONS = [
  { value: 'acquisition', label: 'Net-New Acquisition' },
  { value: 'expansion', label: 'Expansion / Cross-Sell' },
  { value: 'retention', label: 'Retention / Renewal' },
  { value: 'event', label: 'Event Campaign' },
];

export default function CreateCampaignModal({ companies, onClose, onCreated }: Props) {
  const [step, setStep] = useState<'config' | 'plays' | 'review'>('config');
  const [name, setName] = useState('');
  const [motion, setMotion] = useState('acquisition');
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id ?? '');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const divisions = selectedCompany?.departments ?? [];

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/play-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDivision = (id: string) => {
    setSelectedDivisionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/account-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          name: name || `${MOTIONS.find((m) => m.value === motion)?.label ?? 'Campaign'} — ${selectedCompany?.name ?? ''}`,
          motion,
          templateIds: Array.from(selectedTemplateIds),
          divisionIds: selectedDivisionIds.size > 0 ? Array.from(selectedDivisionIds) : undefined,
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setCreating(false);
    }
  };

  const totalRuns = selectedTemplateIds.size;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '85vh',
          overflow: 'auto',
          borderRadius: 16,
          background: t.surface,
          border: `1px solid ${t.borderMed}`,
          padding: 28,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text1, marginBottom: 20 }}>
          Start Account Campaign
        </h2>

        {/* Step 1: Config */}
        {step === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 6 }}>Account</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedDivisionIds(new Set()); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: `1px solid ${t.border}`, color: t.text1, fontSize: 13 }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 6 }}>Campaign Name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g., Q2 ${selectedCompany?.name ?? ''} Acquisition`}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: `1px solid ${t.border}`, color: t.text1, fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 6 }}>Motion</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {MOTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMotion(m.value)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: `1px solid ${motion === m.value ? t.blueBorder : t.border}`,
                      background: motion === m.value ? t.blueBg : 'transparent',
                      color: motion === m.value ? t.blue : t.text3,
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Division selection */}
            {divisions.length > 0 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.text2, display: 'block', marginBottom: 6 }}>
                  Target Divisions <span style={{ fontWeight: 400, color: t.text3 }}>(select buying groups to coordinate across)</span>
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {divisions.map((d) => {
                    const isSelected = selectedDivisionIds.has(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDivision(d.id)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? t.blueBorder : t.border}`,
                          background: isSelected ? t.blueBg : 'transparent',
                          color: isSelected ? t.blue : t.text3,
                          cursor: 'pointer',
                        }}
                      >
                        {d.name || d.type.replace(/_/g, ' ')} ({d.contactCount})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('plays')}
              disabled={!selectedCompanyId}
              style={{
                padding: '12px 0',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Next: Select Plays →
            </button>
          </div>
        )}

        {/* Step 2: Play selection */}
        {step === 'plays' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: t.text2, margin: 0 }}>
              Select plays to run across the selected divisions. Each play × division creates a coordination thread.
            </p>

            {loadingTemplates ? (
              <p style={{ fontSize: 12, color: t.text3, textAlign: 'center', padding: 20 }}>Loading plays...</p>
            ) : (
              <div style={{ maxHeight: 340, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplateIds.has(tmpl.id);
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => toggleTemplate(tmpl.id)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? t.blueBorder : t.border}`,
                        background: isSelected ? t.blueBg : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? t.blue : t.text3}`, background: isSelected ? t.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>{tmpl.name}</span>
                        <span style={{ fontSize: 10, color: t.text3 }}>{(tmpl.phaseCount ?? tmpl._count?.steps ?? 0)} phases</span>
                      </div>
                      {tmpl.description && (
                        <p style={{ fontSize: 11, color: t.text3, margin: '4px 0 0 24px', lineHeight: 1.4 }}>
                          {tmpl.description.length > 120 ? tmpl.description.slice(0, 118) + '...' : tmpl.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setStep('config')} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'transparent', border: `1px solid ${t.border}`, color: t.text2, fontSize: 13, cursor: 'pointer' }}>
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep('review')}
                disabled={selectedTemplateIds.size === 0}
                style={{
                  flex: 2,
                  padding: '10px 0',
                  borderRadius: 8,
                  background: selectedTemplateIds.size > 0 ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(59,130,246,0.15)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selectedTemplateIds.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Review ({selectedTemplateIds.size} play{selectedTemplateIds.size !== 1 ? 's' : ''}) →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4 }}>Account</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>{selectedCompany?.name}</div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4 }}>Divisions ({selectedDivisionIds.size || 'all'})</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedDivisionIds.size > 0
                  ? divisions.filter((d) => selectedDivisionIds.has(d.id)).map((d) => (
                    <span key={d.id} style={{ fontSize: 11, fontWeight: 600, color: t.blue, background: t.blueBg, border: `1px solid ${t.blueBorder}`, padding: '3px 8px', borderRadius: 4 }}>
                      {d.name || d.type.replace(/_/g, ' ')}
                    </span>
                  ))
                  : <span style={{ fontSize: 12, color: t.text2 }}>All divisions (plays will target the best match)</span>
                }
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 4 }}>
                Plays ({selectedTemplateIds.size}) → {totalRuns} run{totalRuns !== 1 ? 's' : ''} will be created
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {templates.filter((t2) => selectedTemplateIds.has(t2.id)).map((t2) => (
                  <div key={t2.id} style={{ fontSize: 12, color: t.text1, display: 'flex', gap: 6 }}>
                    <span style={{ color: t.green }}>✓</span> {t2.name} ({(t2.phaseCount ?? t2._count?.steps ?? 0)} phases)
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setStep('plays')} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'transparent', border: `1px solid ${t.border}`, color: t.text2, fontSize: 13, cursor: 'pointer' }}>
                ← Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 2,
                  padding: '12px 0',
                  borderRadius: 8,
                  background: creating ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: creating ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Creating...' : `Launch Campaign (${totalWorkflows} threads)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
