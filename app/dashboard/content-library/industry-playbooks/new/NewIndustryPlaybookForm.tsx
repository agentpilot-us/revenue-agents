'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function NewIndustryPlaybookForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [overview, setOverview] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/industry-playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          overview: overview.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details?.formErrors?.[0]?.[0] || res.statusText);
      setMessage({ type: 'success', text: 'Industry playbook added. Redirecting...' });
      router.push('/dashboard/content-library');
      router.refresh();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add industry playbook' });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-6 space-y-4">
      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
          }`}
        >
          {message.text}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
          placeholder="e.g. Automotive OEM, Healthcare"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overview (optional)</label>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          rows={3}
          className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-gray-100"
          placeholder="Brief overview of this industry and how you position for it"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Adding...' : 'Add industry playbook'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/content-library')}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
