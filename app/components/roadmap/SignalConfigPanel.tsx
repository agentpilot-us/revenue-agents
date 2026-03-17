'use client';

import { useState, useEffect, useCallback } from 'react';

type SignalConfig = {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  isActive: boolean;
  companyId: string | null;
  createdAt: string;
};

type Props = {
  companyId?: string;
  hideEmptyMessage?: boolean;
};

const SIGNAL_TYPES = [
  { value: 'exa_search', label: 'Web Intelligence Search' },
  { value: 'date_trigger', label: 'Date Trigger' },
];

function getTypeLabel(type: string): string {
  return SIGNAL_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function SignalConfigPanel({ companyId, hideEmptyMessage }: Props) {
  const [configs, setConfigs] = useState<SignalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('exa_search');
  const [formQuery, setFormQuery] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formDaysBefore, setFormDaysBefore] = useState('90,60,30');

  const fetchConfigs = useCallback(async () => {
    try {
      const url = companyId
        ? `/api/signals/config?companyId=${companyId}`
        : '/api/signals/config';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const resetForm = () => {
    setFormName('');
    setFormType('exa_search');
    setFormQuery('');
    setFormKeywords('');
    setFormDaysBefore('90,60,30');
    setEditingId(null);
    setShowForm(false);
  };

  const buildConfigPayload = () => {
    if (formType === 'exa_search') {
      return {
        query: formQuery,
        keywords: formKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      };
    }
    return {
      daysBefore: formDaysBefore
        .split(',')
        .map((d) => Number(d.trim()))
        .filter((n) => !isNaN(n)),
    };
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/signals/config/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            config: buildConfigPayload(),
          }),
        });
      } else {
        await fetch('/api/signals/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            type: formType,
            config: buildConfigPayload(),
            companyId: companyId ?? undefined,
          }),
        });
      }
      resetForm();
      await fetchConfigs();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cfg: SignalConfig) => {
    await fetch(`/api/signals/config/${cfg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cfg.isActive }),
    });
    await fetchConfigs();
  };

  const handleEdit = (cfg: SignalConfig) => {
    setEditingId(cfg.id);
    setFormName(cfg.name);
    setFormType(cfg.type);
    const c = cfg.config as Record<string, unknown>;
    if (cfg.type === 'exa_search') {
      setFormQuery((c.query as string) ?? '');
      setFormKeywords(
        Array.isArray(c.keywords) ? (c.keywords as string[]).join(', ') : ''
      );
    } else {
      setFormDaysBefore(
        Array.isArray(c.daysBefore) ? (c.daysBefore as number[]).join(', ') : '90,60,30'
      );
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/signals/config/${id}`, { method: 'DELETE' });
    await fetchConfigs();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading signal configs...</p>;
  }

  return (
    <div className="space-y-3">
      {configs.length === 0 && !showForm && !hideEmptyMessage && (
        <p className="text-muted-foreground text-sm">No signal configs defined yet.</p>
      )}

      {configs.map((cfg) => (
        <div
          key={cfg.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handleToggleActive(cfg)}
              className={`h-4 w-8 shrink-0 rounded-full transition-colors ${
                cfg.isActive ? 'bg-emerald-500' : 'bg-zinc-500'
              } relative`}
              title={cfg.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                  cfg.isActive ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            <div className="min-w-0">
              <span className="text-xs font-medium">{cfg.name}</span>
              <span className="text-xs text-muted-foreground ml-2">({getTypeLabel(cfg.type)})</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleEdit(cfg)}
              className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cfg.id)}
              className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Quarterly Earnings Watch"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {!editingId && (
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {SIGNAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formType === 'exa_search' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Search Query</label>
                <input
                  type="text"
                  value={formQuery}
                  onChange={(e) => setFormQuery(e.target.value)}
                  placeholder="e.g. company expansion AI"
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Keywords <span className="text-muted-foreground font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="e.g. AI, machine learning, data platform"
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {formType === 'date_trigger' && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Days Before{' '}
                <span className="text-muted-foreground font-normal">(comma-separated numbers)</span>
              </label>
              <input
                type="text"
                value={formDaysBefore}
                onChange={(e) => setFormDaysBefore(e.target.value)}
                placeholder="90,60,30"
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="text-xs font-medium bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          + Add Signal Config
        </button>
      )}
    </div>
  );
}
