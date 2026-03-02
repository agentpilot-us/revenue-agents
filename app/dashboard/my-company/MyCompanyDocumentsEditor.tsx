'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function MyCompanyDocumentsEditor() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/my-company/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          url: url.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to add document.');
        return;
      }
      setTitle('');
      setUrl('');
      setDescription('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] gap-2">
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Title
          </span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q2 board deck, Product launch brief"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            URL (optional)
          </span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link to doc, Notion, or Drive"
          />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="text-[11px] font-medium text-muted-foreground">
          Description (optional)
        </span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs min-h-[60px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short note on how/when to use this document."
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !title.trim()}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add document'}
        </button>
        {error && (
          <span className="text-[11px] text-amber-500 truncate max-w-[220px]">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

