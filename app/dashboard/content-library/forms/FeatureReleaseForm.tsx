'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  productId: string;
  initialData?: {
    id: string;
    title: string;
    releaseDate: string;
    version: string;
    features: string[];
    benefits: string[];
    targetAudience: string[];
    relatedProducts: string[];
    department?: string;
    industry?: string;
  };
  onSave?: () => void;
};

export function FeatureReleaseForm({ productId, initialData, onSave }: Props) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate ?? '');
  const [version, setVersion] = useState(initialData?.version ?? '');
  const [features, setFeatures] = useState<string[]>(
    initialData?.features?.length ? [...initialData.features] : ['']
  );
  const [benefits, setBenefits] = useState<string[]>(
    initialData?.benefits?.length ? [...initialData.benefits] : ['']
  );
  const [targetAudience, setTargetAudience] = useState(
    initialData?.targetAudience?.join(', ') ?? ''
  );
  const [relatedProducts, setRelatedProducts] = useState(
    initialData?.relatedProducts?.join(', ') ?? ''
  );
  const [department, setDepartment] = useState(initialData?.department ?? '');
  const [industry, setIndustry] = useState(initialData?.industry ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const setFeature = (i: number, v: string) => {
    setFeatures((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };
  const addFeature = () => setFeatures((prev) => [...prev, '']);
  const removeFeature = (i: number) =>
    setFeatures((prev) => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)));

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

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const content = {
        releaseDate: releaseDate || new Date().toISOString().split('T')[0],
        version: version || undefined,
        features: features.filter(Boolean),
        benefits: benefits.filter(Boolean),
        targetAudience: targetAudience.split(',').map((s) => s.trim()).filter(Boolean),
        relatedProducts: relatedProducts.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const url = initialData
        ? `/api/content-library`
        : '/api/content-library';
      const method = initialData ? 'PATCH' : 'POST';
      const body = initialData
        ? {
            id: initialData.id,
            title: title || `Feature Release ${releaseDate || 'Latest'}`,
            content,
            department: department || undefined,
            industry: industry || undefined,
          }
        : {
            productId,
            title: title || `Feature Release ${releaseDate || 'Latest'}`,
            type: 'FeatureRelease',
            content,
            department: department || undefined,
            industry: industry || undefined,
          };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setMessage({ type: 'success', text: 'Saved.' });
      onSave?.();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [
    productId,
    initialData,
    title,
    releaseDate,
    version,
    features,
    benefits,
    targetAudience,
    relatedProducts,
    department,
    industry,
    onSave,
  ]);

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
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Title</h2>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q1 2025 Product Updates"
          className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Release Date</h2>
        <Input
          type="date"
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
          className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Version (optional)</h2>
        <Input
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. v2.1.0"
          className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
        />
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Features</h2>
        {features.map((f, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              type="text"
              value={f}
              onChange={(e) => setFeature(i, e.target.value)}
              placeholder="e.g. Enhanced GPU performance"
              className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeFeature(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addFeature}>
          + Add feature
        </Button>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Benefits</h2>
        {benefits.map((b, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              type="text"
              value={b}
              onChange={(e) => setBenefit(i, e.target.value)}
              placeholder="e.g. 30% faster rendering"
              className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
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
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Target Audience</h2>
        <Input
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="e.g. Manufacturing, IT Infrastructure, Design Teams"
          className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Comma-separated list of departments or industries
        </p>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Related Products (optional)</h2>
        <Input
          type="text"
          value={relatedProducts}
          onChange={(e) => setRelatedProducts(e.target.value)}
          placeholder="e.g. Your Product Name, Feature"
          className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Comma-separated list of product names
        </p>
      </section>

      <section className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Tags (for filtering)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Department</label>
            <Input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Industry</label>
            <Input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
            />
          </div>
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
