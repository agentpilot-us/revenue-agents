'use client';

import { useState, useEffect, useCallback } from 'react';

type PlayTemplateOption = {
  id: string;
  name: string;
  slug: string;
  triggerType: string;
  phaseCount: number;
};

type SignalMapping = {
  id: string;
  signalType: string;
  playTemplateId: string;
  priority: string;
  autoActivate: boolean;
  playTemplate: PlayTemplateOption;
  createdAt: string;
};

type AccountActivation = {
  id: string;
  playTemplateId: string;
  isActive: boolean;
  playTemplate: PlayTemplateOption;
  activatedAt: string;
};

const SIGNAL_CATEGORIES = [
  { value: 'exec_hire', label: 'Executive Hire' },
  { value: 'executive_hire', label: 'Executive Hire (alt)' },
  { value: 'new_csuite_executive', label: 'New C-Suite Executive' },
  { value: 'new_vp_hire', label: 'New VP-Level Hire' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'product_launch_announcement', label: 'Product Launch Announcement' },
  { value: 'competitor_detected', label: 'Competitor Detected' },
  { value: 'competitor_displacement', label: 'Competitor Displacement' },
  { value: 'contract_renewal_window', label: 'Contract Renewal Window' },
  { value: 'contract_renewal_approaching', label: 'Contract Renewal Approaching' },
  { value: 'champion_promoted', label: 'Champion Promoted' },
  { value: 'funding_round', label: 'Funding Round' },
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'earnings_call', label: 'Earnings Call' },
  { value: 'job_posting_signal', label: 'Job Posting Signal' },
  { value: 'renewal_approaching', label: 'Renewal Approaching' },
  { value: 'industry_news', label: 'Industry News' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
] as const;

type Props = {
  roadmapId: string;
};

export function PlayRulesPanel({ roadmapId }: Props) {
  const [mappings, setMappings] = useState<SignalMapping[]>([]);
  const [activations, setActivations] = useState<AccountActivation[]>([]);
  const [playTemplates, setPlayTemplates] = useState<PlayTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMappingForm, setShowMappingForm] = useState(false);
  const [mappingSignalType, setMappingSignalType] = useState('exec_hire');
  const [mappingPlayTemplateId, setMappingPlayTemplateId] = useState('');
  const [mappingPriority, setMappingPriority] = useState('MEDIUM');
  const [savingMapping, setSavingMapping] = useState(false);

  const [showActivationPicker, setShowActivationPicker] = useState(false);
  const [addingActivation, setAddingActivation] = useState(false);

  const fetchMappings = useCallback(async () => {
    const res = await fetch('/api/signal-play-mappings');
    if (res.ok) {
      const data = await res.json();
      setMappings(data.mappings ?? []);
    }
  }, []);

  const fetchActivations = useCallback(async () => {
    const res = await fetch(`/api/roadmap/account-play-activations?roadmapId=${roadmapId}`);
    if (res.ok) {
      const data = await res.json();
      setActivations(data.activations ?? []);
    }
  }, [roadmapId]);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/play-templates');
    if (res.ok) {
      const data = await res.json();
      setPlayTemplates(data.templates ?? []);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchMappings(), fetchActivations(), fetchTemplates()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchMappings, fetchActivations, fetchTemplates]);

  const handleAddMapping = async () => {
    if (!mappingPlayTemplateId) return;
    setSavingMapping(true);
    try {
      const res = await fetch('/api/signal-play-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalType: mappingSignalType,
          playTemplateId: mappingPlayTemplateId,
          priority: mappingPriority,
        }),
      });
      if (res.ok) {
        setShowMappingForm(false);
        setMappingSignalType('exec_hire');
        setMappingPlayTemplateId('');
        setMappingPriority('MEDIUM');
        await fetchMappings();
      }
    } finally {
      setSavingMapping(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    await fetch(`/api/signal-play-mappings/${id}`, { method: 'DELETE' });
    await fetchMappings();
  };

  const handleAddActivation = async (playTemplateId: string) => {
    setAddingActivation(true);
    try {
      const res = await fetch('/api/roadmap/account-play-activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId, playTemplateId }),
      });
      if (res.ok) {
        setShowActivationPicker(false);
        await fetchActivations();
      }
    } finally {
      setAddingActivation(false);
    }
  };

  const handleRemoveActivation = async (id: string) => {
    await fetch(`/api/roadmap/account-play-activations/${id}`, { method: 'DELETE' });
    await fetchActivations();
  };

  const handleToggleActivation = async (id: string, current: boolean) => {
    await fetch(`/api/roadmap/account-play-activations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    await fetchActivations();
  };

  const activeActivationIds = new Set(activations.map((a) => a.playTemplateId));
  const availableTemplates = playTemplates.filter((t) => !activeActivationIds.has(t.id));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading play rules...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Signal → Play rules (user-level) */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-1">Signal → Play rules</h3>
        <p className="text-[10px] text-muted-foreground mb-2">
          When a signal is detected, which play runs. These apply across accounts; use &quot;Activated plays&quot; below to control which plays can run for this account.
        </p>
        {mappings.length === 0 && !showMappingForm && (
          <p className="text-muted-foreground text-sm">No signal→play rules yet.</p>
        )}
        <div className="space-y-2">
          {mappings.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-foreground">
                  When &quot;{m.signalType.replace(/_/g, ' ')}&quot; → {m.playTemplate.name}
                </span>
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {m.priority}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteMapping(m.id)}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {showMappingForm ? (
          <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3 mt-2">
            <div>
              <label className="block text-xs font-medium mb-1">Signal type</label>
              <select
                value={mappingSignalType}
                onChange={(e) => setMappingSignalType(e.target.value)}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5"
              >
                {SIGNAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Play</label>
              <select
                value={mappingPlayTemplateId}
                onChange={(e) => setMappingPlayTemplateId(e.target.value)}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5"
              >
                <option value="">Select play...</option>
                {playTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={mappingPriority}
                onChange={(e) => setMappingPriority(e.target.value)}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddMapping}
                disabled={savingMapping || !mappingPlayTemplateId}
                className="text-xs font-medium bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {savingMapping ? 'Saving...' : 'Add rule'}
              </button>
              <button
                type="button"
                onClick={() => setShowMappingForm(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMappingForm(true)}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 mt-2"
          >
            + Add signal → play rule
          </button>
        )}
      </div>

      {/* Activated plays for this account */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-1">Activated plays for this account</h3>
        <p className="text-[10px] text-muted-foreground mb-2">
          Only these plays can be started by signals for this Strategic Account Plan. Enable the plays you want to run here.
        </p>
        {activations.length === 0 && !showActivationPicker && (
          <p className="text-muted-foreground text-sm">No plays activated for this account.</p>
        )}
        <div className="space-y-2">
          {activations.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-foreground">{a.playTemplate.name}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {a.isActive ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActivation(a.id, a.isActive)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
                >
                  {a.isActive ? 'Turn off' : 'Turn on'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveActivation(a.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {showActivationPicker ? (
          <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3 mt-2">
            <label className="block text-xs font-medium mb-1">Add play</label>
            <div className="flex flex-wrap gap-2">
              {availableTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground">All plays are already activated.</p>
              ) : (
                availableTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleAddActivation(t.id)}
                    disabled={addingActivation}
                    className="text-xs font-medium bg-blue-600/80 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    + {t.name}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowActivationPicker(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowActivationPicker(true)}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 mt-2"
          >
            + Activate a play for this account
          </button>
        )}
      </div>
    </div>
  );
}
