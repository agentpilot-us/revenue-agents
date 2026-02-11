'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function NewFrameworkForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const hasContent = content.trim().length > 0;
    if (!hasContent && !pdfFile) {
      setError('Add framework content (paste text or upload a PDF)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/messaging-frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          content: content.trim() || ' ',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create framework');
        return;
      }
      const framework = data.framework as { id: string };
      if (pdfFile && framework?.id) {
        const formData = new FormData();
        formData.set('file', pdfFile);
        const ingestRes = await fetch(`/api/messaging-frameworks/${framework.id}/ingest-pdf`, {
          method: 'POST',
          body: formData,
        });
        const ingestData = await ingestRes.json();
        if (!ingestRes.ok) {
          setError(ingestData?.error || ingestData?.message || 'Framework created but PDF upload failed');
          setLoading(false);
          return;
        }
      }
      router.push('/dashboard/messaging');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <Link href="/dashboard/messaging" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
        ← Messaging frameworks
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Add messaging framework</h1>
      <p className="text-gray-500 mb-6">
        Add value props, positioning, and key messages by account. The Expansion agent uses company-specific frameworks when drafting outreach (or your default for any account).
      </p>
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
            placeholder="e.g. Enterprise value prop, Autonomous vehicles ICP"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload PDF (optional)
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Framework content *
          </label>
          <textarea
            id="content"
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="Paste or type your messaging framework: value propositions, positioning, key messages, do's and don'ts, tone guidelines... (or upload a PDF above)"
          />
          <p className="text-xs text-gray-500 mt-1">
            The agent uses this when composing outreach. Upload a PDF to extract text into the framework.
          </p>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save framework'}
          </button>
          <Link
            href="/dashboard/messaging"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
