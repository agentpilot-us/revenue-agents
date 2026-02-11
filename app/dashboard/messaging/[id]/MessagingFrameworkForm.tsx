'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Framework = {
  id: string;
  name: string;
  content: string;
};

export function MessagingFrameworkForm({ framework }: { framework: Framework }) {
  const router = useRouter();
  const [name, setName] = useState(framework.name);
  const [content, setContent] = useState(framework.content);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
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
          content: content.trim(),
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

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadSuccess(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch(`/api/messaging-frameworks/${framework.id}/ingest-pdf`, {
        method: 'POST',
        body: formData,
      });
      let data: { error?: string; message?: string; chunks?: number; content?: string };
      try {
        data = await res.json();
      } catch {
        setError(`Upload failed (${res.status}).`);
        return;
      }
      if (!res.ok) {
        setError(data?.error || data?.message || `Upload failed (${res.status})`);
        return;
      }
      setUploadSuccess(data.message ?? 'PDF text imported into framework.');
      setContent(data.content ?? content);
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setUploading(false);
      e.target.value = '';
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
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Framework content *
          </label>
          <p className="text-sm text-gray-500 mb-1">
            Enter or paste your messaging guidelines. The Expansion agent uses this when drafting outreach. Save when done.
          </p>
          <textarea
            id="content"
            required
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload PDF (optional)
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Extract text from a PDF and replace framework content with it.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading and processing PDF…</p>}
          {uploadSuccess && (
            <p className="text-sm text-green-700 bg-green-50 p-2 rounded-lg mt-2">{uploadSuccess}</p>
          )}
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
