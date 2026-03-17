'use client';

import { useState, useEffect, useCallback } from 'react';

type TemplateStep = {
  id: string;
  order: number;
  name: string | null;
  label: string | null;
  channel: string | null;
  promptHint: string | null;
  targetPersona: string | null;
  description: string | null;
};

type StepOverride = {
  stepOrder: number;
  promptHint?: string;
  targetDivisionId?: string;
  targetPersona?: string;
  channel?: string;
};

type CustomConfig = {
  stepOverrides?: StepOverride[];
  targetContactIds?: string[];
  targetDivisionIds?: string[];
  notes?: string;
  autonomyLevel?: string;
};

type Division = { id: string; type: string; customName: string | null };
type Contact = { id: string; firstName: string; lastName: string; title: string | null };

type Props = {
  activationId: string;
  playTemplateId: string;
  templateName: string;
  companyId: string;
  currentConfig: CustomConfig | null;
  onSave: () => void;
  onClose: () => void;
};

export function PlayCustomizationDrawer({
  activationId,
  playTemplateId,
  templateName,
  companyId,
  currentConfig,
  onSave,
  onClose,
}: Props) {
  const [steps, setSteps] = useState<TemplateStep[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [overrides, setOverrides] = useState<StepOverride[]>(
    currentConfig?.stepOverrides ?? []
  );
  const [targetContactIds, setTargetContactIds] = useState<string[]>(
    currentConfig?.targetContactIds ?? []
  );
  const [targetDivisionIds, setTargetDivisionIds] = useState<string[]>(
    currentConfig?.targetDivisionIds ?? []
  );
  const [notes, setNotes] = useState(currentConfig?.notes ?? '');

  const fetchData = useCallback(async () => {
    try {
      const [templateRes, divRes, contactRes] = await Promise.all([
        fetch(`/api/play-templates/${playTemplateId}`),
        fetch(`/api/companies/${companyId}/departments`),
        fetch(`/api/companies/${companyId}/contacts?limit=100`),
      ]);

      if (templateRes.ok) {
        const data = await templateRes.json();
        const phases = data.phases ?? [];
        const stepsFromPhases: TemplateStep[] = phases.flatMap((p: { id: string; name: string; orderIndex: number; contentTemplates?: Array<{ id: string; name: string }> }) =>
          (p.contentTemplates && p.contentTemplates.length > 0
            ? p.contentTemplates.map((c: { id: string; name: string }, ci: number) => ({
                id: c.id,
                order: p.orderIndex * 10 + ci,
                name: c.name,
                label: c.name,
                channel: null,
                promptHint: null,
                targetPersona: null,
                description: p.name,
              }))
            : [{
                id: p.id,
                order: p.orderIndex,
                name: p.name,
                label: p.name,
                channel: null,
                promptHint: null,
                targetPersona: null,
                description: null,
              }])
        );
        setSteps(stepsFromPhases);
      }
      if (divRes.ok) {
        const data = await divRes.json();
        setDivisions(data.departments ?? data ?? []);
      }
      if (contactRes.ok) {
        const data = await contactRes.json();
        setContacts(data.contacts ?? data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [playTemplateId, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getOverride = (stepOrder: number) =>
    overrides.find((o) => o.stepOrder === stepOrder);

  const updateOverride = (stepOrder: number, field: keyof StepOverride, value: string) => {
    setOverrides((prev) => {
      const existing = prev.find((o) => o.stepOrder === stepOrder);
      if (existing) {
        return prev.map((o) =>
          o.stepOrder === stepOrder ? { ...o, [field]: value || undefined } : o
        );
      }
      return [...prev, { stepOrder, [field]: value || undefined }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanOverrides = overrides.filter(
      (o) => o.promptHint || o.targetDivisionId || o.targetPersona || o.channel
    );
    const newConfig: CustomConfig = {
      ...(currentConfig ?? {}),
      stepOverrides: cleanOverrides.length > 0 ? cleanOverrides : undefined,
      targetContactIds: targetContactIds.length > 0 ? targetContactIds : undefined,
      targetDivisionIds: targetDivisionIds.length > 0 ? targetDivisionIds : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await fetch(`/api/roadmap/account-play-activations/${activationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customConfig: newConfig }),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  const toggleDivision = (divId: string) => {
    setTargetDivisionIds((prev) =>
      prev.includes(divId) ? prev.filter((d) => d !== divId) : [...prev, divId]
    );
  };

  const toggleContact = (cId: string) => {
    setTargetContactIds((prev) =>
      prev.includes(cId) ? prev.filter((c) => c !== cId) : [...prev, cId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-background border-l border-border flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Customize Play</h2>
            <p className="text-[11px] text-muted-foreground">{templateName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse text-center py-8">
              Loading template steps...
            </p>
          ) : (
            <>
              {/* Step Overrides */}
              <div>
                <h3 className="text-xs font-semibold mb-3">Step Overrides</h3>
                <div className="space-y-3">
                  {steps
                    .sort((a, b) => a.order - b.order)
                    .map((step) => {
                      const ov = getOverride(step.order);
                      return (
                        <div
                          key={step.id}
                          className="rounded-lg border border-border bg-card/60 p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">
                              {step.order}
                            </span>
                            <span className="text-xs font-medium">
                              {step.name || step.label || `Step ${step.order}`}
                            </span>
                            {step.channel && (
                              <span className="text-[9px] text-muted-foreground bg-card/80 border border-border px-1.5 py-0.5 rounded">
                                {step.channel}
                              </span>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-[10px] text-muted-foreground ml-7">
                              {step.description}
                            </p>
                          )}
                          <div className="ml-7 space-y-2">
                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-0.5">
                                Prompt Hint (account-specific context)
                              </label>
                              <textarea
                                rows={2}
                                value={ov?.promptHint ?? ''}
                                onChange={(e) => updateOverride(step.order, 'promptHint', e.target.value)}
                                placeholder={step.promptHint || 'Add context for this step...'}
                                className="w-full text-xs rounded-md border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] text-muted-foreground mb-0.5">
                                  Division Override
                                </label>
                                <select
                                  value={ov?.targetDivisionId ?? ''}
                                  onChange={(e) => updateOverride(step.order, 'targetDivisionId', e.target.value)}
                                  className="w-full text-[11px] rounded-md border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">Default</option>
                                  {divisions.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.customName || d.type.replace(/_/g, ' ')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-muted-foreground mb-0.5">
                                  Persona Override
                                </label>
                                <input
                                  type="text"
                                  value={ov?.targetPersona ?? ''}
                                  onChange={(e) => updateOverride(step.order, 'targetPersona', e.target.value)}
                                  placeholder={step.targetPersona || 'e.g. VP, Director'}
                                  className="w-full text-[11px] rounded-md border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-muted-foreground mb-0.5">
                                  Channel Override
                                </label>
                                <select
                                  value={ov?.channel ?? ''}
                                  onChange={(e) => updateOverride(step.order, 'channel', e.target.value)}
                                  className="w-full text-[11px] rounded-md border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">Default ({step.channel || 'any'})</option>
                                  <option value="email">Email</option>
                                  <option value="linkedin">LinkedIn</option>
                                  <option value="call">Call</option>
                                  <option value="meeting">Meeting</option>
                                  <option value="task">Task</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Target Divisions */}
              <div>
                <h3 className="text-xs font-semibold mb-2">Target Divisions</h3>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Select divisions this play should target at this account.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {divisions.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDivision(d.id)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded border transition-colors ${
                        targetDivisionIds.includes(d.id)
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-card/40 text-muted-foreground border-border hover:border-blue-500/20'
                      }`}
                    >
                      {d.customName || d.type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Contacts */}
              <div>
                <h3 className="text-xs font-semibold mb-2">Target Contacts</h3>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Pre-assign contacts for this play.
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded border transition-colors flex items-center justify-between ${
                        targetContactIds.includes(c.id)
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                          : 'bg-card/40 text-muted-foreground border-border hover:border-blue-500/20'
                      }`}
                    >
                      <span>{c.firstName} {c.lastName}</span>
                      {c.title && <span className="text-[9px] text-muted-foreground">{c.title}</span>}
                    </button>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">No contacts found for this account.</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-xs font-semibold mb-2">Notes</h3>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any account-specific notes for this play..."
                  className="w-full text-xs rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="text-xs font-medium bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Customizations'}
          </button>
        </div>
      </div>
    </div>
  );
}
