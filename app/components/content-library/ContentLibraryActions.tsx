'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'url' | 'site' | 'upload';

export function ContentLibraryActions({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const refresh = () => {
    router.refresh();
    onSuccess?.();
  };
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [mapLinks, setMapLinks] = useState<{ url: string; title?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleScrapeUrl = async () => {
    if (!url.trim()) {
      setError('Enter a URL');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/content-library/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scrape failed');
      setSuccess(`Added ${data.created ?? 0} page(s).`);
      setUrl('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverLinks = async () => {
    if (!siteUrl.trim()) {
      setError('Enter site URL');
      return;
    }
    setLoading(true);
    setError('');
    setMapLinks([]);
    try {
      const res = await fetch('/api/content-library/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl.trim(), limit: 200 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discover failed');
      setMapLinks((data.links ?? []).slice(0, 100));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discover failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeSite = async (selectedUrls?: string[]) => {
    const urlsToScrape =
      selectedUrls && selectedUrls.length > 0
        ? selectedUrls
        : mapLinks.map((l) => l.url).slice(0, 40);
    if (urlsToScrape.length === 0) {
      setError('Discover links first or enter a single URL');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/content-library/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToScrape }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scrape failed');
      setSuccess(`Added ${data.created ?? 0} page(s).`);
      setMapLinks([]);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/content-library/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(`Uploaded "${file.name}".`);
      e.target.value = '';
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 rounded text-sm ${mode === 'url' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}
        >
          Scrape URL
        </button>
        <button
          type="button"
          onClick={() => setMode('site')}
          className={`px-3 py-1.5 rounded text-sm ${mode === 'site' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}
        >
          Scrape site
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-1.5 rounded text-sm ${mode === 'upload' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}
        >
          Upload file
        </button>
      </div>

      {mode === 'url' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            placeholder="https://example.com/page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={handleScrapeUrl}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Scraping…' : 'Scrape'}
          </button>
        </div>
      )}

      {mode === 'site' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="url"
              placeholder="https://example.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={handleDiscoverLinks}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? '…' : 'Discover links'}
            </button>
            {mapLinks.length > 0 && (
              <button
                type="button"
                onClick={() => handleScrapeSite()}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Scraping…' : `Scrape all (${mapLinks.length})`}
              </button>
            )}
          </div>
          {mapLinks.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-700 p-2 text-sm">
              {mapLinks.slice(0, 50).map((l, i) => (
                <div key={i} className="truncate text-gray-700 dark:text-gray-300">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {l.title || l.url}
                  </a>
                </div>
              ))}
              {mapLinks.length > 50 && <p className="text-gray-500 mt-1">+ {mapLinks.length - 50} more</p>}
            </div>
          )}
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
            {loading ? 'Uploading…' : 'Choose file (PDF, DOCX, TXT)'}
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{success}</p>}
    </div>
  );
}
