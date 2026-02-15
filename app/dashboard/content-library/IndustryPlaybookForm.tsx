'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

type MappingRow = { department: string; productIds: string[]; typicalDealSize: string };

type Props = {
  catalogProducts: { id: string; name: string }[];
  initialData: {
    id?: string;
    name: string;
    slug: string;
    overview: string;
    departmentProductMapping: MappingRow[];
    valuePropsByDepartment: Record<string, unknown>;
    buyingCommittee: string;
    landmines: string[];
    relevantCaseStudyIds: string[];
  } | null;
};

export function IndustryPlaybookForm({ catalogProducts, initialData }: Props) {
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [overview, setOverview] = useState(initialData?.overview ?? '');
  const [mapping, setMapping] = useState<MappingRow[]>(
    initialData?.departmentProductMapping?.length
      ? initialData.departmentProductMapping.map((r) => ({
          department: r.department ?? '',
          productIds: Array.isArray(r.productIds) ? r.productIds : [],
          typicalDealSize: (r as MappingRow).typicalDealSize ?? '',
        }))
      : [{ department: '', productIds: [], typicalDealSize: '' }]
  );
  const [buyingCommittee, setBuyingCommittee] = useState(initialData?.buyingCommittee ?? '');
  const [landmines, setLandmines] = useState<string[]>(
    initialData?.landmines?.length ? [...initialData.landmines] : ['']
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        overview: overview.trim() || null,
        departmentProductMapping: mapping
          .filter((r) => r.department.trim())
          .map((r) => ({
            department: r.department.trim(),
            productIds: r.productIds.filter(Boolean),
            typicalDealSize: r.typicalDealSize.trim() || undefined,
          })),
        buyingCommittee: buyingCommittee.trim() || null,
        landmines: landmines.filter(Boolean),
      };

      if (isEdit && initialData?.id) {
        const res = await fetch(`/api/industry-playbooks/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        setMessage({ type: 'success', text: 'Saved.' });
      } else {
        const res = await fetch('/api/industry-playbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        setMessage({ type: 'success', text: 'Created. You can edit from the Industries tab.' });
        setName('');
        setSlug('');
        setOverview('');
        setMapping([{ department: '', productIds: [], typicalDealSize: '' }]);
        setBuyingCommittee('');
        setLandmines(['']);
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [
    isEdit,
    initialData?.id,
    name,
    slug,
    overview,
    mapping,
    buyingCommittee,
    landmines,
  ]);

  const setMappingRow = (i: number, field: keyof MappingRow, value: string | string[]) => {
    setMapping((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addMappingRow = () => {
    setMapping((prev) => [...prev, { department: '', productIds: [], typicalDealSize: '' }]);
  };

  const removeMappingRow = (i: number) => {
    setMapping((prev) => (prev.length <= 1 ? [{ department: '', productIds: [], typicalDealSize: '' }] : prev.filter((_, j) => j !== i)));
  };

  const toggleProduct = (rowIndex: number, productId: string) => {
    setMapping((prev) => {
      const next = [...prev];
      const ids = next[rowIndex].productIds ?? [];
      next[rowIndex].productIds = ids.includes(productId)
        ? ids.filter((id) => id !== productId)
        : [...ids, productId];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Name & slug</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Automotive OEM"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Slug (URL-friendly, unique)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. automotive-oem"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Industry overview</h2>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          placeholder="Brief overview of this industry and key pressures..."
          rows={4}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Department – product mapping</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          For each department, select products and optional typical deal size. The AI uses this to pick relevant product knowledge.
        </p>
        {mapping.map((row, i) => (
          <div key={i} className="border border-gray-200 dark:border-zinc-600 rounded p-3 mb-3 bg-gray-50 dark:bg-zinc-700/50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={row.department}
                onChange={(e) => setMappingRow(i, 'department', e.target.value)}
                placeholder="Department (e.g. Autonomous Vehicles)"
                className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={row.typicalDealSize}
                onChange={(e) => setMappingRow(i, 'typicalDealSize', e.target.value)}
                placeholder="Typical deal size"
                className="w-40 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeMappingRow(i)}>
                Remove
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {catalogProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-1 text-sm cursor-pointer text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={(row.productIds ?? []).includes(p.id)}
                    onChange={() => toggleProduct(i, p.id)}
                    className="rounded"
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addMappingRow}>
          + Add row
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Typical buying committee</h2>
        <textarea
          value={buyingCommittee}
          onChange={(e) => setBuyingCommittee(e.target.value)}
          placeholder="Economic Buyer: VP/SVP... Technical Evaluator: Director..."
          rows={3}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Landmines (things to avoid)</h2>
        {landmines.map((l, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={l}
              onChange={(e) => {
                setLandmines((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                });
              }}
              placeholder="e.g. Don't compare to Tesla unless they bring it up"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLandmines((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)))
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLandmines((prev) => [...prev, ''])}
        >
          + Add landmine
        </Button>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create playbook'}
        </Button>
      </div>
    </div>
  );
}
