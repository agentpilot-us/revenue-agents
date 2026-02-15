'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  contentLibraryId: string;
  initialData: {
    title: string;
    headline: string;
    oneLiner: string;
    fullSummary: string;
    keyMetrics: string[];
    whenToUse: string;
    department: string;
    industry: string;
    company: string;
    sourceUrl: string;
  };
};

export function SuccessStoryEditForm({ contentLibraryId, initialData }: Props) {
  const [title, setTitle] = useState(initialData.title);
  const [headline, setHeadline] = useState(initialData.headline);
  const [oneLiner, setOneLiner] = useState(initialData.oneLiner);
  const [fullSummary, setFullSummary] = useState(initialData.fullSummary);
  const [keyMetrics, setKeyMetrics] = useState<string[]>(
    initialData.keyMetrics.length ? [...initialData.keyMetrics] : ['']
  );
  const [whenToUse, setWhenToUse] = useState(initialData.whenToUse);
  const [department, setDepartment] = useState(initialData.department);
  const [industry, setIndustry] = useState(initialData.industry);
  const [company, setCompany] = useState(initialData.company);
  const [sourceUrl, setSourceUrl] = useState(initialData.sourceUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const content = {
        headline: headline || title,
        oneLiner: oneLiner || undefined,
        fullSummary: fullSummary || undefined,
        keyMetrics: keyMetrics.filter(Boolean),
        whenToUse: whenToUse || undefined,
        valueProp: oneLiner || undefined,
      };
      const res = await fetch('/api/content-library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contentLibraryId,
          title: title || headline,
          content,
          department: department || undefined,
          industry: industry || undefined,
          company: company || undefined,
          sourceUrl: sourceUrl || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setMessage({ type: 'success', text: 'Saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [
    contentLibraryId,
    title,
    headline,
    oneLiner,
    fullSummary,
    keyMetrics,
    whenToUse,
    department,
    industry,
    company,
    sourceUrl,
  ]);

  const setMetric = (i: number, v: string) => {
    setKeyMetrics((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };
  const addMetric = () => setKeyMetrics((prev) => [...prev, '']);
  const removeMetric = (i: number) =>
    setKeyMetrics((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)));

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
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Title (internal)</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Headline</h2>
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Ford: 55% Faster Concept-to-Prototype"
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">One-liner (for emails)</h2>
        <input
          type="text"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          placeholder="Short sentence for email copy"
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Full summary (for deeper conversations)</h2>
        <textarea
          value={fullSummary}
          onChange={(e) => setFullSummary(e.target.value)}
          rows={5}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Key metrics</h2>
        {keyMetrics.map((m, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={m}
              onChange={(e) => setMetric(i, e.target.value)}
              placeholder="e.g. 55% faster concept-to-prototype"
              className="flex-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeMetric(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addMetric}>
          + Add metric
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">When to use</h2>
        <textarea
          value={whenToUse}
          onChange={(e) => setWhenToUse(e.target.value)}
          placeholder="e.g. Use with automotive design teams. Don't use with Ford competitors."
          rows={2}
          className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Tags (for filtering)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Source URL (e.g. PDF)</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
