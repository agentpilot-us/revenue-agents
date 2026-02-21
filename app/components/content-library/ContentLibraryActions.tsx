'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StructuredPageExtraction } from '@/lib/content-library/structured-extraction';
import { CONTENT_LIBRARY_HEALTH_INVALIDATE } from '@/app/components/content-library/ContentLibraryHealthPanel';

type Mode = 'url' | 'site' | 'upload';

type MapLinkItem = { url: string; title?: string; description?: string };

type ReviewItem = {
  url: string;
  title: string;
  description: string;
  suggestedType: string;
  type: string;
  industry?: string;
  department?: string;
  contentPayload: unknown;
  extraction?: StructuredPageExtraction;
};

function ReviewItemCard({
  item,
  selected,
  onToggle,
}: {
  item: ReviewItem;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ext = item.extraction;
  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
      <label className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-zinc-700/50 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-blue-600"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">{item.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
              {item.type}
            </span>
            {ext?.confidence && (
              <span className={`px-2 py-0.5 text-xs rounded ${ext.confidence === 'high' ? 'bg-green-100 dark:bg-green-900/30' : ext.confidence === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-700'} text-gray-700 dark:text-gray-300`}>
                {ext.confidence} confidence
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
          {ext && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setExpanded((x) => !x); }}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {expanded ? 'Hide what we found' : 'Show what we found'}
            </button>
          )}
        </div>
      </label>
      {ext && expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-zinc-800/50 p-3 text-sm space-y-2">
          {ext.valuePropositions?.length > 0 && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Value propositions:</span>
              <ul className="list-disc list-inside mt-0.5 text-gray-600 dark:text-gray-400">{ext.valuePropositions.slice(0, 5).map((v, i) => <li key={i}>{v}</li>)}</ul>
            </div>
          )}
          {ext.capabilities?.length > 0 && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Capabilities:</span>
              <ul className="list-disc list-inside mt-0.5 text-gray-600 dark:text-gray-400">{ext.capabilities.slice(0, 6).map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {ext.proofPoints?.length > 0 && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Proof points:</span>
              <ul className="list-disc list-inside mt-0.5 text-gray-600 dark:text-gray-400">{ext.proofPoints.slice(0, 5).map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {ext.pricingStance && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Pricing:</span>
              <p className="mt-0.5 text-gray-600 dark:text-gray-400">{ext.pricingStance}</p>
            </div>
          )}
          {ext.missingSignals?.length > 0 && (
            <div>
              <span className="font-medium text-amber-700 dark:text-amber-400">Missing:</span>
              <ul className="list-disc list-inside mt-0.5 text-gray-600 dark:text-gray-400">{ext.missingSignals.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContentLibraryActions({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const refresh = () => {
    router.refresh();
    onSuccess?.();
  };
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [mapLinks, setMapLinks] = useState<MapLinkItem[]>([]);
  const [highValueLinks, setHighValueLinks] = useState<MapLinkItem[]>([]);
  const [lowValueLinks, setLowValueLinks] = useState<MapLinkItem[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedReviewItems, setSelectedReviewItems] = useState<Set<number>>(new Set());
  const [approving, setApproving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number } | null>(null);

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
    setHighValueLinks([]);
    setLowValueLinks([]);
    setSelectedUrls(new Set());
    try {
      const res = await fetch('/api/content-library/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl.trim(), limit: 200 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discover failed');
      const links = data.links ?? [];
      const high = data.highValue ?? [];
      const low = data.lowValue ?? [];
      setMapLinks(links);
      setHighValueLinks(high);
      setLowValueLinks(low);
      setSelectedUrls(new Set(high.map((l: MapLinkItem) => l.url)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discover failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeSite = async () => {
    const urlsToScrape = Array.from(selectedUrls).slice(0, 30);
    if (urlsToScrape.length === 0) {
      setError('Discover links first and select at least one URL');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setBatchProgress({ total: urlsToScrape.length, done: 0 });
    try {
      const res = await fetch('/api/content-library/batch-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToScrape }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Batch scrape failed to start');
      }
      if (!res.body) {
        setError('No response stream');
        setBatchProgress(null);
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'started') {
              setBatchProgress({ total: event.total, done: 0 });
            } else if (event.type === 'page') {
              setBatchProgress((prev) => (prev ? { ...prev, done: event.index } : null));
            } else if (event.type === 'complete') {
              setBatchProgress(null);
              setMapLinks([]);
              setHighValueLinks([]);
              setLowValueLinks([]);
              setSelectedUrls(new Set());
              window.dispatchEvent(new CustomEvent(CONTENT_LIBRARY_HEALTH_INVALIDATE));
              refresh();
              setSuccess(`Saved ${event.saved} page(s).${event.failed > 0 ? ` ${event.failed} failed or skipped.` : ''}`);
            } else if (event.type === 'error') {
              setError(event.message ?? 'Batch scrape error');
              setBatchProgress(null);
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
      setBatchProgress(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Get data failed');
      setBatchProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleUrlSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllUrls = () => setSelectedUrls(new Set([...highValueLinks, ...lowValueLinks].map((l) => l.url)));
  const selectHighValueOnly = () => setSelectedUrls(new Set(highValueLinks.map((l) => l.url)));
  const deselectAllUrls = () => setSelectedUrls(new Set());

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
      window.dispatchEvent(new CustomEvent(CONTENT_LIBRARY_HEALTH_INVALIDATE));
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
      const sourceUrl = data.sourceUrl ?? `upload://${data.id}`;
      const newItem: ReviewItem = {
        url: sourceUrl,
        title: data.title ?? file.name,
        description: data.extraction?.keyMessages?.[0] ?? '',
        suggestedType: data.type ?? 'UploadedDocument',
        type: data.type ?? 'UploadedDocument',
        contentPayload: { extraction: data.extraction },
        extraction: data.extraction,
      };
      setReviewItems((prev) => {
        const next = [...prev, newItem];
        setSelectedReviewItems(new Set([next.length - 1]));
        return next;
      });
      setSuccess(`"${file.name}" uploaded — review and confirm below.`);
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
            {(highValueLinks.length > 0 || lowValueLinks.length > 0) && (
              <button
                type="button"
                onClick={handleScrapeSite}
                disabled={loading || selectedUrls.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {batchProgress
                  ? `Scraping ${batchProgress.done} of ${batchProgress.total}…`
                  : loading
                    ? 'Getting data…'
                    : `Get Data (${selectedUrls.size} selected)`}
              </button>
            )}
          </div>
          {highValueLinks.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recommended</p>
              <div className="max-h-32 overflow-y-auto rounded border border-slate-200 dark:border-slate-700 p-2 text-sm space-y-1">
                {highValueLinks.slice(0, 30).map((l) => (
                  <label key={l.url} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(l.url)}
                      onChange={() => toggleUrlSelection(l.url)}
                      className="rounded border-gray-300 dark:border-zinc-600 text-blue-600"
                    />
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1" onClick={(e) => e.stopPropagation()}>
                      {l.title || l.url}
                    </a>
                  </label>
                ))}
                {highValueLinks.length > 30 && <p className="text-gray-500">+ {highValueLinks.length - 30} more</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectHighValueOnly} className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded">Select recommended only</button>
                <button type="button" onClick={selectAllUrls} className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded">Select all</button>
                <button type="button" onClick={deselectAllUrls} className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded">Deselect all</button>
              </div>
            </div>
          )}
          {lowValueLinks.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Optional (blog, legal, etc.)</p>
              <div className="max-h-24 overflow-y-auto rounded border border-slate-200 dark:border-slate-700 p-2 text-sm space-y-1">
                {lowValueLinks.slice(0, 15).map((l) => (
                  <label key={l.url} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(l.url)}
                      onChange={() => toggleUrlSelection(l.url)}
                      className="rounded border-gray-300 dark:border-zinc-600 text-blue-600"
                    />
                    <span className="truncate">{l.title || l.url}</span>
                  </label>
                ))}
                {lowValueLinks.length > 15 && <p className="text-gray-500">+ {lowValueLinks.length - 15} more</p>}
              </div>
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
              <ReviewItemCard
                key={index}
                item={item}
                index={index}
                selected={selectedReviewItems.has(index)}
                onToggle={() => toggleReviewItem(index)}
              />
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
