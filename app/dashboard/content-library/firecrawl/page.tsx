'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';

type Workflow = 'use-cases' | 'case-studies' | 'frameworks' | 'events' | 'schedules';

type ScheduleRow = {
  id: string;
  url: string;
  contentType: string;
  frequency: string;
  nextRunAt: string;
  lastRunAt: string | null;
  product: { id: string; name: string };
};

export default function ContentLibraryFirecrawlPage() {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow>('use-cases');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [productId, setProductId] = useState('');
  const [useCaseUrl, setUseCaseUrl] = useState('');
  const [caseStudyUrl, setCaseStudyUrl] = useState('');
  const [caseStudyWait, setCaseStudyWait] = useState(true);
  const [frameworkUrls, setFrameworkUrls] = useState('');
  const [eventsQuery, setEventsQuery] = useState('');
  const [eventSourceName, setEventSourceName] = useState('Events');
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [scheduleContentType, setScheduleContentType] = useState<'case-studies' | 'use-cases'>('case-studies');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    synced?: number;
    total?: number;
    crawlId?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const [firecrawlConfigured, setFirecrawlConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/services/status')
      .then((res) => res.json())
      .then((data) => setFirecrawlConfigured(data.firecrawl === true))
      .catch(() => setFirecrawlConfigured(false));
  }, []);

  useEffect(() => {
    fetch('/api/user/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products?.length) {
          setProducts(data.products);
          setProductId(data.products[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (workflow === 'schedules') {
      fetch('/api/content-library/firecrawl/schedules')
        .then((res) => res.json())
        .then((data) => setSchedules(data.schedules ?? []))
        .catch(() => setSchedules([]));
    }
  }, [workflow]);

  const handleUseCases = async () => {
    if (!useCaseUrl.trim() || !productId) {
      setResult({ success: false, error: 'Enter URL and select product' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/content-library/firecrawl/use-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: useCaseUrl.trim(), productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult({ success: true, synced: data.synced, total: data.total });
      router.refresh();
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCaseStudies = async () => {
    if (!caseStudyUrl.trim() || !productId) {
      setResult({ success: false, error: 'Enter URL and select product' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/content-library/firecrawl/case-studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: caseStudyUrl.trim(),
          productId,
          wait: caseStudyWait,
          limit: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crawl failed');
      setResult({
        success: true,
        synced: data.synced,
        total: data.total,
        crawlId: data.crawlId,
        message: data.message,
      });
      router.refresh();
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleFrameworks = async () => {
    const urls = frameworkUrls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0 || !productId) {
      setResult({ success: false, error: 'Enter at least one URL and select product' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/content-library/firecrawl/frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extract failed');
      setResult({ success: true, synced: data.synced, total: data.total });
      router.refresh();
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleEventsSearch = async () => {
    if (!eventsQuery.trim() || !productId) {
      setResult({ success: false, error: 'Enter search query and select product' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/content-library/firecrawl/events-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: eventsQuery.trim(),
          productId,
          eventSourceName: eventSourceName.trim() || 'Events',
          limit: 10,
          scrape: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResult({ success: true, synced: data.synced, total: data.total });
      router.refresh();
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleUrl.trim() || !productId) {
      setResult({ success: false, error: 'Enter URL and select product' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/content-library/firecrawl/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scheduleUrl.trim(),
          productId,
          contentType: scheduleContentType,
          frequency: scheduleFrequency,
          limit: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult({ success: true, synced: 1 });
      setScheduleUrl('');
      setSchedules((prev) => [...prev, data.schedule]);
      router.refresh();
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await fetch(`/api/content-library/firecrawl/schedules/${id}`, { method: 'DELETE' });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      {!firecrawlConfigured && <FirecrawlSetupCard />}
      <div className="mb-6">
        <Link
          href="/dashboard/content-library"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Content Library
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Firecrawl – Content Library
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Scrape, crawl, or extract content from your site and docs into Use Cases, Case Studies, and
        Frameworks. Keeps content fresh with optional webhooks.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['use-cases', 'case-studies', 'frameworks', 'events', 'schedules'] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWorkflow(w)}
            className={`px-4 py-2 rounded ${
              workflow === w
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            {w === 'use-cases' && 'Use cases'}
            {w === 'case-studies' && 'Case studies'}
            {w === 'frameworks' && 'Frameworks'}
            {w === 'events' && 'Events (search)'}
            {w === 'schedules' && 'Schedules'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl space-y-6">
        {workflow === 'use-cases' && (
          <section className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Import use cases from your website
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scrape a use-cases or solutions page; we extract industry-specific use cases and add
              them to the Content Library.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Use cases page URL
              </label>
              <input
                type="url"
                value={useCaseUrl}
                onChange={(e) => setUseCaseUrl(e.target.value)}
                placeholder="https://yourcompany.com/use-cases"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleUseCases}
                disabled={loading || !firecrawlConfigured}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importing…' : 'Import use cases'}
              </button>
            </div>
          </section>
        )}

        {workflow === 'case-studies' && (
          <section className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Crawl case studies / success stories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Crawl your customers or case-studies section. By default we wait for the crawl to
              finish and then import; you can also start async and use a webhook.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Base URL (e.g. customers or case-studies)
              </label>
              <input
                type="url"
                value={caseStudyUrl}
                onChange={(e) => setCaseStudyUrl(e.target.value)}
                placeholder="https://yourcompany.com/customers"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={caseStudyWait}
                  onChange={(e) => setCaseStudyWait(e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  Wait for crawl to complete (1–2 min) and import now
                </span>
              </label>
              <button
                type="button"
                onClick={handleCaseStudies}
                disabled={loading || !firecrawlConfigured}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (caseStudyWait ? 'Crawling…' : 'Starting…') : 'Start crawl'}
              </button>
            </div>
          </section>
        )}

        {workflow === 'frameworks' && (
          <section className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Extract frameworks from docs
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Extract sales frameworks (MEDDIC, value-based selling, objection handling) from
              internal doc URLs. One URL per line or comma-separated.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Doc URLs
              </label>
              <textarea
                value={frameworkUrls}
                onChange={(e) => setFrameworkUrls(e.target.value)}
                placeholder="https://docs.yourcompany.com/sales-frameworks"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleFrameworks}
                disabled={loading || !firecrawlConfigured}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Extracting…' : 'Extract frameworks'}
              </button>
            </div>
          </section>
        )}

        {workflow === 'events' && (
          <section className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Search for events
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Search the web for events (e.g. &quot;Salesforce events 2026&quot;, &quot;Conference
              sessions 2026&quot;). We scrape results and extract events into the Content Library.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Search query
              </label>
              <input
                type="text"
                value={eventsQuery}
                onChange={(e) => setEventsQuery(e.target.value)}
                placeholder="e.g. Conference 2026 sessions"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Event source name (for filtering)
              </label>
              <input
                type="text"
                value={eventSourceName}
                onChange={(e) => setEventSourceName(e.target.value)}
                placeholder="GTC"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleEventsSearch}
                disabled={loading || !firecrawlConfigured}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching…' : 'Search & import events'}
              </button>
            </div>
          </section>
        )}

        {workflow === 'schedules' && (
          <section className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Scheduled crawls
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Run case-study or use-case imports on a daily or weekly schedule. The cron runs once
              per day (3:00 AM UTC); set <code className="bg-gray-200 dark:bg-zinc-700 px-1 rounded">CRON_SECRET</code> in
              your environment and call <code className="bg-gray-200 dark:bg-zinc-700 px-1 rounded">/api/cron/content-library/run-schedules</code> with
              <code className="bg-gray-200 dark:bg-zinc-700 px-1 rounded ml-1">Authorization: Bearer &lt;CRON_SECRET&gt;</code> or <code className="bg-gray-200 dark:bg-zinc-700 px-1 rounded">?secret=&lt;CRON_SECRET&gt;</code>.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                URL to crawl
              </label>
              <input
                type="url"
                value={scheduleUrl}
                onChange={(e) => setScheduleUrl(e.target.value)}
                placeholder="https://yourcompany.com/customers"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Content type
              </label>
              <select
                value={scheduleContentType}
                onChange={(e) => setScheduleContentType(e.target.value as 'case-studies' | 'use-cases')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                <option value="case-studies">Case studies</option>
                <option value="use-cases">Use cases</option>
              </select>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Frequency
              </label>
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value as 'daily' | 'weekly')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Product
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSchedule}
                disabled={loading || !firecrawlConfigured}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Add schedule'}
              </button>
            </div>
            {schedules.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Your schedules</h3>
                <ul className="space-y-2">
                  {schedules.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-zinc-700"
                    >
                      <div>
                        <span className="font-medium">{s.product.name}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          {s.contentType} · {s.frequency}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 block truncate max-w-md">
                          {s.url}
                        </span>
                        <span className="text-xs text-gray-400">
                          Next: {new Date(s.nextRunAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="text-red-600 dark:text-red-400 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {result && (
          <div
            className={`p-4 rounded-lg ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {result.success && (
              <>
                <p>
                  Synced {result.synced} of {result.total} items.
                  {result.crawlId && ` Crawl ID: ${result.crawlId}`}
                </p>
                {result.message && <p className="text-sm mt-1">{result.message}</p>}
              </>
            )}
            {!result.success && <p>{result.error}</p>}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 dark:bg-zinc-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
        <strong>User chat capabilities</strong> with a Firecrawl-powered content library: discovery
        (&quot;What content do we have about [topic]?&quot;), matching (&quot;Find materials for
        [prospect/industry]&quot;), freshness (&quot;Latest case studies&quot;), and recommendations
        (&quot;What should I send this prospect?&quot;). Configure a webhook when starting a
        case-study crawl to auto-update when new pages are published.
      </div>
    </div>
  );
}
