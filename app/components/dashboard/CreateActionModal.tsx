'use client';

import { useEffect, useState } from 'react';
import { myDayUrlAfterPlayStart } from '@/lib/dashboard/my-day-navigation';

const t = {
  bg: '#0b1120',
  surface: 'rgba(15,23,42,0.95)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
};

type Template = { id: string; name: string; triggerType: string | null };
type Company = { id: string; name: string };
type ContactOption = { id: string; name: string; email: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateActionModal({ open, onClose, onCreated }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/companies').then((r) => r.json()),
      fetch('/api/play-templates').then((r) => r.json()),
    ]).then(([compData, tmplData]) => {
      setCompanies(compData.companies || compData || []);
      const list = tmplData.templates || tmplData || [];
      setTemplates(list.map((t: { id: string; name: string; triggerType?: string | null }) => ({ id: t.id, name: t.name, triggerType: t.triggerType ?? null })));
    });
  }, [open]);

  useEffect(() => {
    if (mode === 'bulk' && selectedCompany) {
      setLoadingContacts(true);
      fetch(`/api/companies/${selectedCompany}/contacts?limit=50`)
        .then((r) => r.json())
        .then((data) => {
          const list = (data.contacts || data || []).map(
            (c: { id: string; firstName?: string; lastName?: string; email?: string }) => ({
              id: c.id,
              name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
              email: c.email || null,
            }),
          );
          setContacts(list);
        })
        .finally(() => setLoadingContacts(false));
    }
  }, [mode, selectedCompany]);

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!selectedCompany || !selectedTemplate) return;
    setCreating(true);
    setError(null);

    try {
      if (mode === 'bulk' && selectedContacts.size > 0) {
        const contactIds = [...selectedContacts];
        let firstRunId: string | null = null;
        for (const contactId of contactIds) {
          const res = await fetch('/api/play-runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId: selectedCompany,
              playTemplateId: selectedTemplate,
              targetContactId: contactId,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to create');
          }
          const data = await res.json();
          if (!firstRunId) firstRunId = data.playRunId ?? data.playRun?.id;
        }
        onCreated();
        onClose();
        setSelectedCompany('');
        setSelectedTemplate('');
        setSelectedContacts(new Set());
        setMode('single');
        if (firstRunId && typeof window !== 'undefined') {
          window.location.href = myDayUrlAfterPlayStart(firstRunId, selectedCompany);
        }
      } else {
        const res = await fetch('/api/play-runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selectedCompany,
            playTemplateId: selectedTemplate,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create');
        }
        const data = await res.json();
        const runId = data.playRunId ?? data.playRun?.id;
        onCreated();
        onClose();
        setSelectedCompany('');
        setSelectedTemplate('');
        setSelectedContacts(new Set());
        setMode('single');
        if (runId && typeof window !== 'undefined') {
          window.location.href = myDayUrlAfterPlayStart(runId, selectedCompany);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating play run');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 420,
          maxHeight: '80vh',
          overflow: 'auto',
          background: t.surface,
          borderRadius: 14,
          border: `1px solid ${t.borderMed}`,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text1, marginTop: 0 }}>
          Create Action
        </h2>

        {/* Account select */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: t.text3,
              marginBottom: 6,
            }}
          >
            Account
          </label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${t.borderMed}`,
              background: t.bg,
              color: t.text1,
              fontSize: 13,
            }}
          >
            <option value="">Select account...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Template select */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: t.text3,
              marginBottom: 6,
            }}
          >
            Play Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${t.borderMed}`,
              background: t.bg,
              color: t.text1,
              fontSize: 13,
            }}
          >
            <option value="">Select template...</option>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 6 }}>
          {(['single', 'bulk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: mode === m ? t.blueBg : 'transparent',
                border: `1px solid ${mode === m ? t.blueBorder : t.border}`,
                color: mode === m ? t.blue : t.text2,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m === 'single' ? 'Single Action' : 'Bulk Event Invite'}
            </button>
          ))}
        </div>

        {/* Contact selection for bulk */}
        {mode === 'bulk' && selectedCompany && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: t.text3,
                marginBottom: 6,
              }}
            >
              Contacts ({selectedContacts.size} selected)
            </label>
            {loadingContacts ? (
              <div style={{ fontSize: 12, color: t.text3, padding: 8 }}>
                Loading contacts...
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 200,
                  overflow: 'auto',
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: 4,
                }}
              >
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleContact(c.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: selectedContacts.has(c.id) ? t.blueBg : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: `1px solid ${selectedContacts.has(c.id) ? t.blue : 'rgba(255,255,255,0.15)'}`,
                        background: selectedContacts.has(c.id) ? t.blue : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {selectedContacts.has(c.id) ? '✓' : ''}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: t.text1 }}>{c.name}</div>
                      {c.email && (
                        <div style={{ fontSize: 10, color: t.text3 }}>{c.email}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.text2,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !selectedCompany || !selectedTemplate}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background:
                creating || !selectedCompany || !selectedTemplate
                  ? 'rgba(59,130,246,0.15)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor:
                creating || !selectedCompany || !selectedTemplate
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
