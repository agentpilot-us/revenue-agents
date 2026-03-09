'use client';

import { useState, useEffect, useCallback } from 'react';

type Framework = {
  id: string;
  name: string;
  content: string;
};

export function MessagingTab() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchFrameworks = useCallback(async () => {
    try {
      const res = await fetch('/api/messaging-frameworks');
      if (res.ok) {
        const data = await res.json();
        setFrameworks(data.frameworks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this messaging framework?')) return;
    const res = await fetch(`/api/messaging-frameworks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFrameworks((prev) => prev.filter((f) => f.id !== id));
    }
  };

  if (editingId) {
    const fw = frameworks.find((f) => f.id === editingId);
    if (!fw) return null;
    return (
      <FrameworkEditor
        framework={fw}
        onSaved={() => { setEditingId(null); fetchFrameworks(); }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  if (creating) {
    return (
      <FrameworkEditor
        onSaved={() => { setCreating(false); fetchFrameworks(); }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Messaging Frameworks</h2>
          <p className="text-sm text-muted-foreground">
            Positioning, value props, and key messages. The AI agent uses your frameworks when drafting outreach.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shrink-0"
        >
          + Add Framework
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading frameworks...</p>
      ) : frameworks.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground mb-2">No messaging frameworks yet.</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add your positioning, tone guidelines, and key messages so the AI stays on-brand.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Add your first framework
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {frameworks.map((fw) => (
            <div
              key={fw.id}
              className="rounded-lg border border-border bg-card/80 p-4 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{fw.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                    {fw.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(fw.id)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(fw.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type EditorProps = {
  framework?: Framework;
  onSaved: () => void;
  onCancel: () => void;
};

function FrameworkEditor({ framework, onSaved, onCancel }: EditorProps) {
  const isNew = !framework;
  const [name, setName] = useState(framework?.name ?? '');
  const [content, setContent] = useState(framework?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!content.trim()) { setError('Content is required'); return; }
    setSaving(true);
    setError('');

    try {
      if (isNew) {
        const res = await fetch('/api/messaging-frameworks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), content: content.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? 'Failed to create');
          return;
        }
      } else {
        const res = await fetch(`/api/messaging-frameworks/${framework.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), content: content.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? 'Failed to update');
          return;
        }
      }
      onSaved();
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Messaging
      </button>
      <h2 className="text-lg font-semibold">
        {isNew ? 'Add Messaging Framework' : `Edit: ${framework.name}`}
      </h2>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</p>
      )}

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-muted-foreground">Name *</span>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Enterprise value prop, Design Partner Outreach"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-muted-foreground">Framework content *</span>
        <p className="text-[11px] text-muted-foreground">
          Positioning, value props, tone guidelines, do&apos;s and don&apos;ts. The AI uses this when drafting all outreach.
        </p>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[300px] font-mono"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type your messaging framework..."
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Create Framework' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
