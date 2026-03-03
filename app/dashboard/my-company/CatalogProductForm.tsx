'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

export function CatalogProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useCases, setUseCases] = useState<string[]>([]);
  const [targetPersonas, setTargetPersonas] = useState<string[]>([]);

  const useCaseRef = useRef<HTMLInputElement>(null);
  const personaRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setDescription('');
    setUseCases([]);
    setTargetPersonas([]);
    setError(null);
  }

  function handleTagKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    list: string[],
    setList: (v: string[]) => void
  ) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.currentTarget.value.trim();
    if (val && !list.includes(val)) {
      setList([...list, val]);
    }
    e.currentTarget.value = '';
  }

  function removeTag(list: string[], setList: (v: string[]) => void, idx: number) {
    setList(list.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          useCases,
          targetPersonas,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to create product.');
        return;
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create product.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Product
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          New product
        </h3>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          Name <span className="text-amber-500">*</span>
        </span>
        <input
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Enterprise Platform"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs min-h-[70px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief product description…"
        />
      </label>

      {/* Use Cases tag input */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Use cases</span>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {useCases.map((tag, i) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(useCases, setUseCases, i)}
                className="hover:text-primary/70"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          ref={useCaseRef}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          placeholder="Type and press Enter to add"
          onKeyDown={(e) => handleTagKeyDown(e, useCases, setUseCases)}
        />
      </div>

      {/* Target Personas tag input */}
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Target personas</span>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {targetPersonas.map((tag, i) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(targetPersonas, setTargetPersonas, i)}
                className="hover:text-primary/70"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          ref={personaRef}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          placeholder="Type and press Enter to add"
          onKeyDown={(e) => handleTagKeyDown(e, targetPersonas, setTargetPersonas)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add Product'}
        </button>
        {error && (
          <span className="text-[11px] text-amber-500 truncate max-w-[260px]">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
