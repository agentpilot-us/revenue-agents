'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Framework = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  isDefault: boolean;
};

export function MessagingFrameworkForm({ framework }: { framework: Framework }) {
  const router = useRouter();
  const [name, setName] = useState(framework.name);
  const [description, setDescription] = useState(framework.description ?? '');
  const [content, setContent] = useState(framework.content);
  const [isDefault, setIsDefault] = useState(framework.isDefault);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging-frameworks/${framework.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          content: content.trim(),
          isDefault: isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update');
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this messaging framework? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/messaging-frameworks/${framework.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Failed to delete');
        return;
      }
      router.push('/dashboard/messaging');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Framework content *
          </label>
          <textarea
            id="content"
            required
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="isDefault"
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-700">
            Use as default framework for the Expansion agent
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            href="/dashboard/messaging"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
      <div className="mt-12 pt-8 border-t border-gray-200">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete this framework'}
        </button>
      </div>
    </>
  );
}
