'use client';

import { useState, useEffect, useCallback } from 'react';

type ContentItem = {
  id: string;
  title: string;
  type: string;
  content: Record<string, unknown>;
  industry: string | null;
  department: string | null;
  persona: string | null;
  isActive: boolean;
  userConfirmed: boolean;
  sourceUrl: string | null;
};

const TYPE_OPTIONS = [
  { value: 'UseCase', label: 'Use Case' },
  { value: 'SuccessStory', label: 'Success Story' },
  { value: 'CompanyEvent', label: 'Event' },
  { value: 'FeatureRelease', label: 'Feature Release' },
  { value: 'Framework', label: 'Framework' },
  { value: 'Battlecard', label: 'Battlecard' },
  { value: 'EmailContent', label: 'Email Template' },
  { value: 'Persona', label: 'Persona' },
] as const;

const TYPE_COLORS: Record<string, string> = {
  UseCase: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  SuccessStory: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  CompanyEvent: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  FeatureRelease: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  Framework: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  Battlecard: 'bg-red-500/10 text-red-400 border-red-500/25',
  EmailContent: 'bg-pink-500/10 text-pink-400 border-pink-500/25',
  Persona: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
};

const CONTENT_FIELDS: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
  UseCase: [
    { key: 'headline', label: 'Headline' },
    { key: 'body', label: 'Body', multiline: true },
    { key: 'keyMetrics', label: 'Key Metrics' },
  ],
  SuccessStory: [
    { key: 'headline', label: 'Headline' },
    { key: 'oneLiner', label: 'One-Liner' },
    { key: 'fullSummary', label: 'Full Summary', multiline: true },
    { key: 'whenToUse', label: 'When to Use' },
  ],
  CompanyEvent: [
    { key: 'eventTitle', label: 'Event Title' },
    { key: 'date', label: 'Date' },
    { key: 'location', label: 'Location' },
    { key: 'description', label: 'Description', multiline: true },
    { key: 'registrationUrl', label: 'Registration URL' },
  ],
  FeatureRelease: [
    { key: 'headline', label: 'Headline' },
    { key: 'body', label: 'Body', multiline: true },
    { key: 'releaseDate', label: 'Release Date' },
  ],
};

function getTypeLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

export function ContentLibraryTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const url = filterType
        ? `/api/content-library?type=${filterType}`
        : '/api/content-library';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.content ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this content item?')) return;
    const res = await fetch(`/api/content-library/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    const res = await fetch('/api/content-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !currentlyActive }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isActive: !currentlyActive } : i)),
      );
    }
  };

  if (editingId) {
    const item = items.find((i) => i.id === editingId);
    if (!item) return null;
    return (
      <ContentItemEditor
        item={item}
        onSaved={() => { setEditingId(null); fetchItems(); }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  if (creating) {
    return (
      <ContentItemEditor
        onSaved={() => { setCreating(false); fetchItems(); }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  const grouped = new Map<string, ContentItem[]>();
  for (const item of items) {
    const list = grouped.get(item.type) ?? [];
    list.push(item);
    grouped.set(item.type, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Content Library</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} items. Use cases, case studies, events, and releases that power AI-generated outreach.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shrink-0"
        >
          + Add Content
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading content...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground mb-2">No content yet.</p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Add your first content item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([type, typeItems]) => (
            <div key={type}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {getTypeLabel(type)} ({typeItems.length})
              </h3>
              <div className="space-y-2">
                {typeItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-card/80 p-3 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {item.title}
                          </h4>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded border ${TYPE_COLORS[item.type] ?? 'bg-muted text-muted-foreground border-border'}`}>
                            {getTypeLabel(item.type)}
                          </span>
                          {!item.isActive && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded bg-muted text-muted-foreground border border-border">
                              Inactive
                            </span>
                          )}
                        </div>
                        <ContentPreview content={item.content} type={item.type} />
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          {item.industry && <span>{item.industry}</span>}
                          {item.department && <span>{item.department}</span>}
                          {item.persona && <span>{item.persona}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id, item.isActive)}
                          className={`text-[10px] px-1.5 py-0.5 ${item.isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentPreview({ content, type }: { content: Record<string, unknown>; type: string }) {
  const headline = content.headline as string | undefined;
  const oneLiner = content.oneLiner as string | undefined;
  const body = content.body as string | undefined;
  const description = content.description as string | undefined;
  const preview = headline || oneLiner || body || description || '';
  if (!preview) return null;
  return (
    <p className="text-[11px] text-muted-foreground line-clamp-2">{String(preview)}</p>
  );
}

type EditorProps = {
  item?: ContentItem;
  onSaved: () => void;
  onCancel: () => void;
};

function ContentItemEditor({ item, onSaved, onCancel }: EditorProps) {
  const isNew = !item;
  const [title, setTitle] = useState(item?.title ?? '');
  const [type, setType] = useState(item?.type ?? 'UseCase');
  const [industry, setIndustry] = useState(item?.industry ?? '');
  const [department, setDepartment] = useState(item?.department ?? '');
  const [persona, setPersona] = useState(item?.persona ?? '');
  const [contentFields, setContentFields] = useState<Record<string, string>>(() => {
    if (!item?.content) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(item.content)) {
      if (typeof v === 'string') result[k] = v;
      else if (Array.isArray(v)) result[k] = v.join('\n');
      else if (v != null) result[k] = JSON.stringify(v);
    }
    return result;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fields = CONTENT_FIELDS[type] ?? [{ key: 'body', label: 'Content', multiline: true }];

  const updateField = (key: string, value: string) => {
    setContentFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');

    const contentObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(contentFields)) {
      if (v.trim()) contentObj[k] = v.trim();
    }

    try {
      if (isNew) {
        const res = await fetch('/api/content-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            type,
            content: contentObj,
            industry: industry.trim() || undefined,
            department: department.trim() || undefined,
            persona: persona.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? 'Failed to create');
          return;
        }
      } else {
        const res = await fetch('/api/content-library', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            title: title.trim(),
            type,
            content: contentObj,
            industry: industry.trim() || null,
            department: department.trim() || null,
            persona: persona.trim() || null,
          }),
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
        &larr; Back to Content Library
      </button>
      <h2 className="text-lg font-semibold">
        {isNew ? 'Add Content' : `Edit: ${item.title}`}
      </h2>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Title *</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Content title"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Industry</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Enterprise Software"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Department</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. SALES"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Persona</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="e.g. Enterprise AE"
          />
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Content Fields
        </h3>
        {fields.map((f) => (
          <label key={f.key} className="space-y-1 block">
            <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
            {f.multiline ? (
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px] font-mono"
                value={contentFields[f.key] ?? ''}
                onChange={(e) => updateField(f.key, e.target.value)}
              />
            ) : (
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={contentFields[f.key] ?? ''}
                onChange={(e) => updateField(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
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
