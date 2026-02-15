'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function IndustryUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    created?: number;
    createdNames?: string[];
    errors?: string[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/content-library/industries/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        errors: [err instanceof Error ? err.message : 'Upload failed'],
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/content-library?tab=industries"
        className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        ← Back to Content Library
      </Link>

      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Upload industry playbooks
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Upload a CSV with columns: <strong>name</strong> (required), overview, buyingCommittee, landmines (comma-separated).
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
            CSV file
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <Link href="/dashboard/content-library?tab=industries">
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>

      {result && (
        <div
          className={`mt-6 p-4 rounded ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          {result.success ? (
            <>
              <p className="font-medium text-green-800 dark:text-green-200">
                Created {result.created ?? 0} industry playbook(s).
              </p>
              {result.createdNames && result.createdNames.length > 0 && (
                <ul className="mt-2 text-sm text-green-700 dark:text-green-300 list-disc list-inside">
                  {result.createdNames.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
