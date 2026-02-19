'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  initialData?: {
    title: string;
    description: string;
    benefits: string[];
    targetDepartment: string;
    industry: string;
    sourceUrl: string;
  };
};

export function UseCaseForm({ initialData }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [benefits, setBenefits] = useState<string[]>(
    initialData?.benefits?.length ? [...initialData.benefits] : ['']
  );
  const [targetDepartment, setTargetDepartment] = useState(initialData?.targetDepartment || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = useCallback(async () => {
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Title is required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const content = {
        description: description || undefined,
        benefits: benefits.filter(Boolean),
        targetDepartment: targetDepartment || undefined,
      };
      const res = await fetch('/api/content-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type: 'UseCase',
          content,
          department: targetDepartment || undefined,
          industry: industry || undefined,
          sourceUrl: sourceUrl || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setMessage({ type: 'success', text: 'Saved. Redirecting...' });
      setTimeout(() => router.push('/dashboard/content-library'), 1000);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [title, description, benefits, targetDepartment, industry, sourceUrl, router]);

  const setBenefit = (i: number, v: string) => {
    setBenefits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };
  const addBenefit = () => setBenefits((prev) => [...prev, '']);
  const removeBenefit = (i: number) =>
    setBenefits((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)));

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
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Title *</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Autonomous Vehicle Simulation"
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          required
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Description</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the use case..."
          rows={5}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Benefits</h2>
        {benefits.map((b, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={b}
              onChange={(e) => setBenefit(i, e.target.value)}
              placeholder="e.g. Faster time to market"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeBenefit(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
          + Add benefit
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Tags</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Target Department</label>
            <input
              type="text"
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value)}
              placeholder="e.g. Engineering, Manufacturing"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Automotive, Healthcare"
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Source URL (optional)</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://example.com/use-case"
            className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
