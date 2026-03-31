'use client';

import { useCallback, useEffect, useState } from 'react';
import { DepartmentType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dispatchMyCompanySetupProgressInvalidate } from '@/lib/my-company/setup-progress-events';

type PersonaRow = {
  id: string;
  name: string;
  description: string | null;
  includeTitles: string[];
  excludeTitles: string[];
  primaryDepartment: DepartmentType | null;
  secondaryDepartments: DepartmentType[];
  painPoints: string[];
  successMetrics: string[];
  contentTypes: string[];
  messagingTone: string;
  preferredChannels: string[];
};

function linesToArray(s: string): string[] {
  return s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

function arrayToLines(a: string[]): string {
  return a.join('\n');
}

const EMPTY_FORM = {
  name: '',
  description: '',
  includeTitles: '',
  excludeTitles: '',
  primaryDepartment: '' as '' | DepartmentType,
  secondaryDepartments: [] as DepartmentType[],
  painPoints: '',
  successMetrics: '',
  contentTypes: '',
  messagingTone: 'business',
  preferredChannels: '',
};

export function PersonasTab() {
  const [items, setItems] = useState<PersonaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/personas');
      if (!res.ok) {
        setError('Could not load personas');
        return;
      }
      const data = (await res.json()) as PersonaRow[];
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCreating(true);
    setError(null);
  }

  function openEdit(p: PersonaRow) {
    setCreating(false);
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      includeTitles: arrayToLines(p.includeTitles),
      excludeTitles: arrayToLines(p.excludeTitles),
      primaryDepartment: p.primaryDepartment ?? '',
      secondaryDepartments: [...p.secondaryDepartments],
      painPoints: arrayToLines(p.painPoints),
      successMetrics: arrayToLines(p.successMetrics),
      contentTypes: arrayToLines(p.contentTypes),
      messagingTone: p.messagingTone || 'business',
      preferredChannels: arrayToLines(p.preferredChannels),
    });
    setError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function toggleSecondary(dept: DepartmentType) {
    setForm((f) => ({
      ...f,
      secondaryDepartments: f.secondaryDepartments.includes(dept)
        ? f.secondaryDepartments.filter((d) => d !== dept)
        : [...f.secondaryDepartments, dept],
    }));
  }

  async function submit() {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      includeTitles: linesToArray(form.includeTitles),
      excludeTitles: linesToArray(form.excludeTitles),
      primaryDepartment: form.primaryDepartment || null,
      secondaryDepartments: form.secondaryDepartments,
      painPoints: linesToArray(form.painPoints),
      successMetrics: linesToArray(form.successMetrics),
      contentTypes: linesToArray(form.contentTypes),
      messagingTone: form.messagingTone.trim() || 'business',
      preferredChannels: linesToArray(form.preferredChannels),
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/personas/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError((j as { error?: string }).error ?? 'Update failed');
          return;
        }
      } else {
        const res = await fetch('/api/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError((j as { error?: string }).error ?? 'Create failed');
          return;
        }
      }
      dispatchMyCompanySetupProgressInvalidate();
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this buyer persona? Contacts referencing it will lose the link.')) return;
    setError(null);
    const res = await fetch(`/api/personas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Delete failed');
      return;
    }
    dispatchMyCompanySetupProgressInvalidate();
    if (editingId === id) closeForm();
    await load();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Buyer personas</h2>
          <p className="text-sm text-muted-foreground">
            Structured profiles for who you sell to — used when generating outreach and matching
            contacts. This is separate from Messaging (your seller voice) and from Content Library
            RAG snippets.
          </p>
        </div>
        <Button type="button" onClick={openCreate} disabled={creating || !!editingId}>
          Add persona
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {(creating || editingId) && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h3 className="font-medium">
            {editingId ? 'Edit persona' : 'New persona'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="p-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Economic buyer"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="p-desc" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Role, context, what they care about"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Primary department</span>
              <Select
                value={form.primaryDepartment || '__none__'}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    primaryDepartment: v === '__none__' ? '' : (v as DepartmentType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {Object.values(DepartmentType).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Messaging tone</span>
              <Input
                value={form.messagingTone}
                onChange={(e) => setForm((f) => ({ ...f, messagingTone: e.target.value }))}
                placeholder="business"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <span className="text-sm font-medium">Secondary departments (toggle)</span>
              <div className="flex flex-wrap gap-2">
                {Object.values(DepartmentType).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={form.secondaryDepartments.includes(d) ? 'default' : 'outline'}
                    className="text-xs"
                    onClick={() => toggleSecondary(d)}
                  >
                    {d.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="p-include" className="text-sm font-medium">
                Include titles (one per line)
              </label>
              <Textarea
                id="p-include"
                value={form.includeTitles}
                onChange={(e) => setForm((f) => ({ ...f, includeTitles: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="p-exclude" className="text-sm font-medium">
                Exclude titles (one per line)
              </label>
              <Textarea
                id="p-exclude"
                value={form.excludeTitles}
                onChange={(e) => setForm((f) => ({ ...f, excludeTitles: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="p-pain" className="text-sm font-medium">
                Pain points (one per line)
              </label>
              <Textarea
                id="p-pain"
                value={form.painPoints}
                onChange={(e) => setForm((f) => ({ ...f, painPoints: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="p-metrics" className="text-sm font-medium">
                Success metrics (one per line)
              </label>
              <Textarea
                id="p-metrics"
                value={form.successMetrics}
                onChange={(e) => setForm((f) => ({ ...f, successMetrics: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="p-ct" className="text-sm font-medium">
                Content types (one per line)
              </label>
              <Textarea
                id="p-ct"
                value={form.contentTypes}
                onChange={(e) => setForm((f) => ({ ...f, contentTypes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="p-ch" className="text-sm font-medium">
                Preferred channels (one per line)
              </label>
              <Textarea
                id="p-ch"
                value={form.preferredChannels}
                onChange={(e) => setForm((f) => ({ ...f, preferredChannels: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No buyer personas yet. Add at least two for full setup progress.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-foreground">{p.name}</div>
                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {p.primaryDepartment?.replace(/_/g, ' ') ?? 'No primary dept'} · {p.messagingTone}{' '}
                  tone
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(p)}
                  disabled={(creating || !!editingId) && editingId !== p.id}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => remove(p.id)}
                  disabled={saving}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
