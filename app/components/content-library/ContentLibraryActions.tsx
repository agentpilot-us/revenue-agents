'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'url' | 'site' | 'upload';

type ReviewItem = {
  url: string;
  title: string;
  description: string;
  suggestedType: string;
  type: string;
  industry?: string;
  department?: string;
  contentPayload: unknown;
};

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
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedReviewItems, setSelectedReviewItems] = useState<Set<number>>(new Set());
  const [approving, setApproving] = useState(false);

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
        body: JSON.stringify({ url: url.trim(), reviewMode: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Get data failed');
      if (data.reviewMode && data.items) {
        setReviewItems(data.items);
        setSelectedReviewItems(new Set(data.items.map((_: unknown, i: number) => i)));
        setUrl('');
      } else {
        setSuccess(`Added ${data.created ?? 0} page(s).`);
        setUrl('');
        refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Get data failed');
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
        body: JSON.stringify({ urls: urlsToScrape, reviewMode: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Get data failed');
      if (data.reviewMode && data.items) {
        setReviewItems(data.items);
        setSelectedReviewItems(new Set(data.items.map((_: unknown, i: number) => i)));
        setMapLinks([]);
      } else {
        setSuccess(`Added ${data.created ?? 0} page(s).`);
        setMapLinks([]);
        refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Get data failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSelected = async () => {
    if (selectedReviewItems.size === 0) {
      setError('Select at least one item to approve');
      return;
    }
    setApproving(true);
    setError('');
    try {
      const itemsToApprove = reviewItems.filter((_, i) => selectedReviewItems.has(i));
      const res = await fetch('/api/content-library/scrape/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToApprove }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      setSuccess(`Added ${data.created ?? 0} page(s).`);
      setReviewItems([]);
      setSelectedReviewItems(new Set());
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setApproving(false);
    }
  };

  const toggleReviewItem = (index: number) => {
    setSelectedReviewItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAllReviewItems = () => {
    setSelectedReviewItems(new Set(reviewItems.map((_, i) => i)));
  };

  const deselectAllReviewItems = () => {
    setSelectedReviewItems(new Set());
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('File too large (max 4 MB). Try a smaller file.');
        }
        const msg = data?.error || data?.details || 'Upload failed';
        throw new Error(msg);
      }
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
          Single URL
        </button>
        <button
          type="button"
          onClick={() => setMode('site')}
          className={`px-3 py-1.5 rounded text-sm ${mode === 'site' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}
        >
          Full site
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
            {loading ? 'Getting data…' : 'Get Data'}
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
                {loading ? 'Getting data…' : `Get Data (${mapLinks.length})`}
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
            {loading ? 'Uploading…' : 'Choose file (PDF, DOCX, TXT, max 4 MB)'}
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

      {/* Review Panel */}
      {reviewItems.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Review scraped content ({reviewItems.length} items)
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllReviewItems}
                className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-zinc-700"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={deselectAllReviewItems}
                className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-zinc-700"
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
            {reviewItems.map((item, index) => (
              <label
                key={index}
                className="flex items-start gap-3 p-3 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-zinc-700/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedReviewItems.has(index)}
                  onChange={() => toggleReviewItem(index)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                      {item.type}
                    </span>
                    {item.industry && (
                      <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {item.industry}
                      </span>
                    )}
                    {item.department && (
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {item.department}
                      </span>
                    )}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block truncate max-w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.url}
                  </a>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedReviewItems.size} of {reviewItems.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setReviewItems([]);
                  setSelectedReviewItems(new Set());
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSelected}
                disabled={approving || selectedReviewItems.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {approving ? 'Adding…' : `Approve selected (${selectedReviewItems.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
