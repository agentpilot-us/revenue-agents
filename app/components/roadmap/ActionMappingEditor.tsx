'use client';

import { useState, useEffect, useCallback } from 'react';

type ActionMapping = {
  id: string;
  signalCategory: string | null;
  actionType: string;
  autonomyLevel: string;
  promptHint: string | null;
  signalRuleId: string | null;
  signalRule: { id: string; name: string; category: string } | null;
  createdAt: string;
};

type Props = {
  roadmapId: string;
};

const SIGNAL_CATEGORIES = [
  { value: 'earnings_call', label: 'Earnings Call' },
  { value: 'product_announcement', label: 'Product Announcement' },
  { value: 'executive_hire', label: 'Executive Hire' },
  { value: 'executive_departure', label: 'Executive Departure' },
  { value: 'funding_round', label: 'Funding Round' },
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'industry_news', label: 'Industry News' },
  { value: 'job_posting_signal', label: 'Job Posting Signal' },
  { value: 'renewal_approaching', label: 'Renewal Approaching' },
] as const;

const AUTONOMY_LEVELS = [
  { value: 'notify_only', label: 'Notify Only', color: 'text-blue-400' },
  { value: 'draft_review', label: 'Draft & Review', color: 'text-amber-400' },
  { value: 'auto_execute', label: 'Auto Execute', color: 'text-emerald-400' },
] as const;

export function ActionMappingEditor({ roadmapId }: Props) {
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCategory, setFormCategory] = useState('earnings_call');
  const [formActionType, setFormActionType] = useState('');
  const [formAutonomy, setFormAutonomy] = useState('draft_review');

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch(`/api/roadmap/action-mappings?roadmapId=${roadmapId}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const resetForm = () => {
    setFormCategory('earnings_call');
    setFormActionType('');
    setFormAutonomy('draft_review');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formActionType.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/roadmap/action-mappings/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signalCategory: formCategory,
            actionType: formActionType,
            autonomyLevel: formAutonomy,
          }),
        });
      } else {
        await fetch('/api/roadmap/action-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roadmapId,
            signalCategory: formCategory,
            actionType: formActionType,
            autonomyLevel: formAutonomy,
          }),
        });
      }
      resetForm();
      await fetchMappings();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: ActionMapping) => {
    setEditingId(m.id);
    setFormCategory(m.signalCategory ?? 'earnings_call');
    setFormActionType(m.actionType);
    setFormAutonomy(m.autonomyLevel);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/roadmap/action-mappings/${id}`, { method: 'DELETE' });
    await fetchMappings();
  };

  const autonomyLabel = (level: string) =>
    AUTONOMY_LEVELS.find((a) => a.value === level);

  const categoryLabel = (cat: string) =>
    SIGNAL_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading action mappings...</p>;
  }

  return (
    <div className="space-y-3">
      {mappings.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">No action mappings defined yet.</p>
      )}

      {mappings.map((m) => {
        const al = autonomyLabel(m.autonomyLevel);
        return (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs">
                <span className="font-medium">{m.actionType}</span>
                {m.signalCategory && (
                  <span className="text-muted-foreground ml-2">
                    {categoryLabel(m.signalCategory)}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                autonomy:{' '}
                <span className={al?.color ?? 'text-amber-400'}>
                  {al?.label ?? m.autonomyLevel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleEdit(m)}
                className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {showForm && (
        <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Signal Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {SIGNAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Action Type</label>
            <input
              type="text"
              value={formActionType}
              onChange={(e) => setFormActionType(e.target.value)}
              placeholder="e.g. New Leader Introduction, Contract Expansion"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Autonomy Level</label>
            <select
              value={formAutonomy}
              onChange={(e) => setFormAutonomy(e.target.value)}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {AUTONOMY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !formActionType.trim()}
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
          + Add Mapping
        </button>
      )}
    </div>
  );
}
