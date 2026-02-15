'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';

type ImportMode = 'url' | 'text';

export default function ImportContentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>('url');
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [company, setCompany] = useState('General Motors');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [textPreviewItems, setTextPreviewItems] = useState<any[]>([]);
  const [editedTagsByIndex, setEditedTagsByIndex] = useState<Record<number, any>>({});
  const [error, setError] = useState('');
  const [editedTags, setEditedTags] = useState<any>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [firecrawlConfigured, setFirecrawlConfigured] = useState<boolean | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scheduleAdded, setScheduleAdded] = useState(false);
  const [scheduleDismissed, setScheduleDismissed] = useState(false);
  const [scheduleAdding, setScheduleAdding] = useState(false);
  const searchParams = useSearchParams();
  const contentType = useMemo(() => searchParams.get('type') || null, [searchParams]);
  const isAddManyType = contentType === 'UseCase' || contentType === 'SuccessStory';

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam && typeof urlParam === 'string') {
      try {
        setUrl(decodeURIComponent(urlParam));
      } catch {
        setUrl(urlParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchProducts() {
      const response = await fetch('/api/products');
      const data = await response.json();
      const list = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);
      setProducts(list);
      if (list.length > 0) {
        setSelectedProduct(list[0].id);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    fetch('/api/services/status')
      .then((res) => res.json())
      .then((data) => setFirecrawlConfigured(data.firecrawl === true))
      .catch(() => setFirecrawlConfigured(false));
  }, []);

  const handleScrape = async () => {
    if (!url || !selectedProduct) {
      setError('Please enter URL and select product');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);
    setEditedTags(null);

    try {
      const response = await fetch('/api/content-library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, productId: selectedProduct }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Import failed');
      }

      setPreview(data);
      setEditedTags(data.inference);
      setLoading(false);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message ?? 'Import failed');
      setLoading(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!pastedText.trim() || !selectedProduct) {
      setError('Please paste content and select product');
      return;
    }

    setLoading(true);
    setError('');
    setTextPreviewItems([]);
    setEditedTagsByIndex({});

    try {
      const response = await fetch('/api/content-library/import-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pastedText,
          productId: selectedProduct,
          company: company || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Import from text failed');
      }

      const items = data.items ?? [];
      setTextPreviewItems(items);
      const initial: Record<number, any> = {};
      items.forEach((item: any, i: number) => {
        initial[i] = {
          industry: item.inference?.industry ?? null,
          department: item.inference?.department ?? null,
          persona: item.inference?.persona ?? null,
          confidence: item.inference?.confidence ?? 'medium',
        };
      });
      setEditedTagsByIndex(initial);
      setLoading(false);
    } catch (err: any) {
      console.error('Import from text error:', err);
      setError(err.message ?? 'Import from text failed');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !editedTags) return;
    try {
      const response = await fetch('/api/content-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          type: preview.extractedContent.type,
          title: preview.extractedContent.title,
          content: preview.extractedContent,
          persona: editedTags.persona,
          department: editedTags.department,
          industry: editedTags.industry,
          company: null,
          sourceUrl: url,
          inferredTags: preview.inference,
          confidenceScore: editedTags.confidence,
          userConfirmed: true,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/content-library');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    }
  };

  const handleSaveAllFromText = async () => {
    if (!textPreviewItems.length) return;
    setSavingAll(true);
    setError('');
    let saved = 0;
    for (let i = 0; i < textPreviewItems.length; i++) {
      const item = textPreviewItems[i];
      const tags = editedTagsByIndex[i] ?? item.inference;
      try {
        const response = await fetch('/api/content-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProduct,
            type: item.type,
            title: item.title,
            content: item.content,
            persona: tags.persona,
            department: tags.department,
            industry: tags.industry,
            company: item.company ?? company,
            sourceUrl: null,
            inferredTags: item.inference,
            confidenceScore: tags.confidence,
            userConfirmed: true,
          }),
        });
        if (response.ok) saved++;
        else {
          const data = await response.json();
          setError(data.error || `Failed to save item ${i + 1}`);
          break;
        }
      } catch (err: any) {
        setError(err instanceof Error ? err.message : 'Failed to save');
        break;
      }
    }
    setSavingAll(false);
    if (saved === textPreviewItems.length) {
      if (isAddManyType) {
        setSaveSuccess(true);
        setTextPreviewItems([]);
        setEditedTagsByIndex({});
        setPastedText('');
        setError('');
      } else {
        router.push('/dashboard/content-library');
      }
    }
  };

  const canScheduleRefresh =
    (contentType === 'UseCase' || contentType === 'SuccessStory') &&
    url &&
    selectedProduct;
  const scheduleContentType =
    contentType === 'UseCase' ? 'use-cases' : contentType === 'SuccessStory' ? 'case-studies' : null;

  const addScheduleRefresh = async (frequency: 'daily' | 'weekly') => {
    if (!scheduleContentType || !url || !selectedProduct) return;
    setScheduleAdding(true);
    setError('');
    try {
      const res = await fetch('/api/content-library/firecrawl/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          productId: selectedProduct,
          contentType: scheduleContentType,
          frequency,
        }),
      });
      if (res.ok) {
        setScheduleAdded(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Could not add schedule');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add schedule');
    } finally {
      setScheduleAdding(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/content-library"
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Content Library
        </Link>
        <h1 className="text-2xl font-bold">Import Content</h1>
        <p className="text-gray-600">
          Import from a URL (scrape + extract) or paste text (e.g. from a PDF messaging guide)
          {isAddManyType && ' — You can add many: after saving, use “Add another” to import more.'}
        </p>
      </div>

      {mode === 'url' && firecrawlConfigured === false && <FirecrawlSetupCard />}

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex flex-wrap items-center gap-4">
          <p className="text-green-800 dark:text-green-200 font-medium">Saved. Add another?</p>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700"
          >
            Add another
          </button>
          <Link
            href={contentType ? `/dashboard/content-library?tab=${contentType}` : '/dashboard/content-library'}
          >
            <button type="button" className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
              Done, go to Content Library
            </button>
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          type="button"
          onClick={() => { setMode('url'); setPreview(null); setTextPreviewItems([]); setError(''); }}
          className={`px-4 py-2 font-medium rounded-t ${mode === 'url' ? 'bg-blue-100 text-blue-800 border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          From URL
        </button>
        <button
          type="button"
          onClick={() => { setMode('text'); setPreview(null); setTextPreviewItems([]); setError(''); }}
          className={`px-4 py-2 font-medium rounded-t ${mode === 'text' ? 'bg-blue-100 text-blue-800 border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          From text (paste)
        </button>
      </div>

      {mode === 'url' && (
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Product Page URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-page"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select product</option>
              {products.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleScrape}
            disabled={!url || !selectedProduct || loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? '🔄 Analyzing page...' : '🌐 Scrape & Extract Content'}
          </button>
        </div>
      </div>
      )}

      {mode === 'text' && (
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste content (e.g. from a PDF sales messaging guide)
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste or type the guide text here. AI will split by buying group/department if sections are present."
              rows={10}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company (for tagging)</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. General Motors"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select product</option>
              {products.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExtractFromText}
            disabled={!pastedText.trim() || !selectedProduct || loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? '🔄 Extracting...' : '📋 Extract & split by department'}
          </button>
        </div>
      </div>
      )}

      {preview && editedTags && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold">Review Extracted Content</h2>
            <span
              className={`px-3 py-1 text-sm rounded ${
                preview.inference.confidence === 'high'
                  ? 'bg-green-100 text-green-700'
                  : preview.inference.confidence === 'medium'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {preview.inference.confidence === 'high' && '✓ High Confidence'}
              {preview.inference.confidence === 'medium' && '~ Medium Confidence'}
              {preview.inference.confidence === 'low' &&
                '⚠️ Low Confidence - Please Review'}
            </span>
          </div>

          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>🤖</span> AI Inferred Tags
              {preview.inference.confidence === 'low' && (
                <span className="text-sm font-normal text-amber-700">
                  (Please verify and edit)
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Industry</label>
                <select
                  value={editedTags.industry || ''}
                  onChange={(e) =>
                    setEditedTags({ ...editedTags, industry: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded bg-white"
                >
                  <option value="">Select industry</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Technology">Technology</option>
                  <option value="Retail">Retail</option>
                  <option value="Energy">Energy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={editedTags.department || ''}
                  onChange={(e) =>
                    setEditedTags({ ...editedTags, department: e.target.value })
                  }
                  placeholder="e.g., Autonomous Vehicles"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Persona</label>
                <input
                  type="text"
                  value={editedTags.persona || ''}
                  onChange={(e) =>
                    setEditedTags({ ...editedTags, persona: e.target.value })
                  }
                  placeholder="e.g., VP Autonomous Vehicles"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>AI Reasoning:</strong> {preview.inference.reasoning}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Title</p>
              <p className="font-semibold text-lg">
                {preview.extractedContent.title}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Type</p>
              <span className="px-3 py-1 bg-gray-100 rounded">
                {preview.extractedContent.type}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Value Proposition
              </p>
              <p className="text-gray-800">
                {preview.extractedContent.valueProp}
              </p>
            </div>

            {preview.extractedContent.useCases &&
              preview.extractedContent.useCases.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Use Cases ({preview.extractedContent.useCases.length})
                  </p>
                  <div className="space-y-3">
                    {preview.extractedContent.useCases.map((uc: any, i: number) => (
                      <div key={i} className="bg-gray-50 p-3 rounded">
                        <p className="font-medium">{uc.name}</p>
                        <p className="text-sm text-gray-600">{uc.description}</p>
                        {uc.targetDepartment && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            🏛️ {uc.targetDepartment}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {preview.extractedContent.benefits &&
              preview.extractedContent.benefits.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Key Benefits
                  </p>
                  <ul className="space-y-1">
                    {preview.extractedContent.benefits.map(
                      (b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{b}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {preview.extractedContent.successStories &&
              preview.extractedContent.successStories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Success Stories
                  </p>
                  <div className="space-y-3">
                    {preview.extractedContent.successStories.map(
                      (story: any, i: number) => (
                        <div
                          key={i}
                          className="border-l-4 border-purple-500 pl-4 py-2"
                        >
                          <p className="font-semibold">{story.company}</p>
                          {story.industry && (
                            <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {story.industry}
                            </span>
                          )}
                          {story.department && (
                            <span className="inline-block mt-1 ml-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {story.department}
                            </span>
                          )}
                          <p className="text-sm text-gray-600 mt-2">
                            {story.challenge}
                          </p>
                          {story.results && story.results.length > 0 && (
                            <ul className="mt-2 text-sm">
                              {story.results.map((r: string, j: number) => (
                                <li key={j} className="text-green-700">
                                  ✓ {r}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>

          {canScheduleRefresh && !scheduleAdded && !scheduleDismissed && (
            <div className="mt-6 p-4 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Update content from this URL automatically?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addScheduleRefresh('daily')}
                  disabled={scheduleAdding}
                  className="px-3 py-1.5 text-sm rounded border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                >
                  {scheduleAdding ? 'Adding...' : 'Daily'}
                </button>
                <button
                  type="button"
                  onClick={() => addScheduleRefresh('weekly')}
                  disabled={scheduleAdding}
                  className="px-3 py-1.5 text-sm rounded border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleDismissed(true)}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  No
                </button>
              </div>
            </div>
          )}
          {scheduleAdded && (
            <p className="mt-4 text-sm text-green-600 dark:text-green-400">
              Automatic refresh from this URL has been added.
            </p>
          )}

          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              ✓ Save to Content Library
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              ✗ Discard
            </button>
          </div>
        </div>
      )}

      {mode === 'text' && textPreviewItems.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Review extracted content ({textPreviewItems.length} section{textPreviewItems.length !== 1 ? 's' : ''})</h2>
          <p className="text-sm text-gray-600 mb-6">
            Edit tags if needed, then save all to Content Library. Each section will be stored with company &quot;{company || 'General Motors'}&quot; and the department below.
          </p>
          <div className="space-y-6">
            {textPreviewItems.map((item: any, i: number) => {
              const tags = editedTagsByIndex[i] ?? item.inference;
              return (
                <div key={i} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Industry</label>
                      <input
                        type="text"
                        value={tags.industry ?? ''}
                        onChange={(e) =>
                          setEditedTagsByIndex((prev) => ({
                            ...prev,
                            [i]: { ...prev[i], industry: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Department</label>
                      <input
                        type="text"
                        value={tags.department ?? ''}
                        onChange={(e) =>
                          setEditedTagsByIndex((prev) => ({
                            ...prev,
                            [i]: { ...prev[i], department: e.target.value },
                          }))
                        }
                        placeholder="e.g. Manufacturing"
                        className="w-full px-3 py-2 border rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Persona</label>
                      <input
                        type="text"
                        value={tags.persona ?? ''}
                        onChange={(e) =>
                          setEditedTagsByIndex((prev) => ({
                            ...prev,
                            [i]: { ...prev[i], persona: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded bg-white"
                      />
                    </div>
                  </div>
                  {item.content?.valueProp && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{item.content.valueProp}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              onClick={handleSaveAllFromText}
              disabled={savingAll}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium disabled:opacity-50"
            >
              {savingAll ? 'Saving...' : `✓ Save all ${textPreviewItems.length} to Content Library`}
            </button>
            <button
              onClick={() => setTextPreviewItems([])}
              className="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              ✗ Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

