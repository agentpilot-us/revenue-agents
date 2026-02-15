'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';

type ContentType = 'gtc' | 'industry' | 'other-events';

export default function SyncNVIDIAContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [selectedType, setSelectedType] = useState<ContentType>('gtc');
  const [productId, setProductId] = useState<string>('');
  const [sessionCatalogUrl, setSessionCatalogUrl] = useState('');
  const [industryUrl, setIndustryUrl] = useState('');
  const [industryName, setIndustryName] = useState('');
  const [eventsUrl, setEventsUrl] = useState('');
  const [eventSourceName, setEventSourceName] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [result, setResult] = useState<{ success: boolean; synced: number; errors?: string[] } | null>(null);
  const [firecrawlConfigured, setFirecrawlConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const type = searchParams.get('type') as ContentType | null;
    const sessionUrl = searchParams.get('sessionCatalogUrl');
    const indUrl = searchParams.get('industryUrl');
    const evUrl = searchParams.get('eventsUrl');
    if (type === 'industry' || type === 'gtc' || type === 'other-events') {
      setSelectedType(type);
    }
    const decode = (s: string | null) => {
      if (!s) return '';
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    };
    if (sessionUrl) setSessionCatalogUrl(decode(sessionUrl));
    if (indUrl) setIndustryUrl(decode(indUrl));
    if (evUrl) setEventsUrl(decode(evUrl));
  }, [searchParams]);

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
        if (data.products) {
          setProducts(data.products);
          if (data.products.length > 0) {
            setProductId(data.products[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleSync = async () => {
    if (selectedType === 'industry' && (!industryUrl || !industryName)) {
      alert('Please enter the industry name (e.g. Automotive) so content is categorized correctly.');
      return;
    }
    if (selectedType === 'gtc' && !sessionCatalogUrl) {
      alert('Please enter the session catalog URL.');
      return;
    }
    if (selectedType === 'other-events' && !eventsUrl) {
      alert('Please enter the events page URL.');
      return;
    }

    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/content-library/sync-nvidia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          productId: selectedType === 'industry' ? productId : (productId || null),
          sessionCatalogUrl: selectedType === 'gtc' ? sessionCatalogUrl : undefined,
          industryUrl: selectedType === 'industry' ? industryUrl : undefined,
          industryName: selectedType === 'industry' ? industryName : undefined,
          eventsUrl: selectedType === 'other-events' ? eventsUrl : undefined,
          eventSourceName: selectedType === 'other-events' ? (eventSourceName || 'Events') : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setResult(data);
      if (data.success) {
        // Refresh after a short delay
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {firecrawlConfigured === false && <FirecrawlSetupCard />}
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Scrape site to add content
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You can also <strong>paste a URL next to each step</strong> on the Content Library page. Use this page when you need to choose content type (GTC sessions, industry page, or other events) or set options like industry name.
        </p>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Enter the URL of the site you want to scrape. Content is categorized by type: GTC sessions (GTC only), industry content (tagged by industry name), or other events (separate from GTC).
        </p>

        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-gray-200 dark:border-zinc-700 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
              Content Type
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="gtc"
                  checked={selectedType === 'gtc'}
                  onChange={(e) => setSelectedType(e.target.value as ContentType)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-200">Session catalog</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="industry"
                  checked={selectedType === 'industry'}
                  onChange={(e) => setSelectedType(e.target.value as ContentType)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-200">Industry Page</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="other-events"
                  checked={selectedType === 'other-events'}
                  onChange={(e) => setSelectedType(e.target.value as ContentType)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-200">Other events (different URL)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
              Product {selectedType === 'gtc' && <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional - sessions are organized by topic/interest)</span>}
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              <option value="">{selectedType === 'gtc' ? 'None (will use default "GTC Sessions" product)' : 'Select a product'}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedType === 'gtc' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Session catalog URL
              </label>
              <input
                type="url"
                value={sessionCatalogUrl}
                onChange={(e) => setSessionCatalogUrl(e.target.value)}
                placeholder="e.g. https://example.com/events/session-catalog/"
                className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter your session catalog or events page URL. Stored events are kept separate by source. You can add query filters if your URL supports them (e.g. ?industries=Automotive).
              </p>
            </div>
          )}

          {selectedType === 'industry' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  Industry Page URL
                </label>
                <input
                  type="url"
                  value={industryUrl}
                  onChange={(e) => setIndustryUrl(e.target.value)}
                  placeholder="e.g. https://example.com/industries/automotive/"
                  className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  Industry name (e.g. Automotive)
                </label>
                <input
                  type="text"
                  value={industryName}
                  onChange={(e) => setIndustryName(e.target.value)}
                  placeholder="e.g. Automotive"
                  className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All scraped content will be tagged as this industry so it’s clear the content is for Automotive (or Healthcare, Manufacturing, etc.).
                </p>
              </div>
            </>
          )}

          {selectedType === 'other-events' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  Events page URL
                </label>
                <input
                  type="url"
                  value={eventsUrl}
                  onChange={(e) => setEventsUrl(e.target.value)}
                  placeholder="e.g. https://example.com/events"
                  className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use a different URL than your main session catalog. Events from this URL are stored separately so you can filter by source.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  Event source name (optional)
                </label>
                <input
                  type="text"
                  value={eventSourceName}
                  onChange={(e) => setEventSourceName(e.target.value)}
                  placeholder="e.g. Webinars, Conference 2025"
                  className="w-full rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used to categorize these events (default: &quot;Events&quot;).
                </p>
              </div>
            </>
          )}

          {selectedType === 'gtc' && sessionCatalogUrl && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Session catalog:</strong> This will fetch sessions from the URL you entered. Sessions are organized by topic/interest and saved as Company Events so the AI can recommend relevant sessions to contacts.
              </p>
            </div>
          )}

          {selectedType === 'industry' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 space-y-2">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Industry Page:</strong> Content scraped from this URL will be tagged with the industry name you entered (e.g. Automotive) so it’s clearly categorized. Success stories, product announcements, and use cases are saved as Success Stories and Feature Releases.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Already have a <strong>Firecrawl agent result</strong> (JSON)?{' '}
                <Link href="/dashboard/content-library/industries/import-result" className="underline font-medium">
                  Paste it here
                </Link>
                .
              </p>
            </div>
          )}

          {selectedType === 'other-events' && eventsUrl && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Other events:</strong> Events from this URL are stored separately from GTC. Use this for webinars, other conferences, or any events page that is not the GTC session catalog.
              </p>
            </div>
          )}

          <Button
            onClick={handleSync}
            disabled={
              syncing ||
              (selectedType === 'industry' && !productId) ||
              (selectedType === 'gtc' && !sessionCatalogUrl) ||
              (selectedType === 'other-events' && !eventsUrl)
            }
            className="w-full"
          >
            {syncing
              ? 'Syncing...'
              : selectedType === 'gtc'
                ? 'Sync sessions'
                : selectedType === 'industry'
                  ? 'Sync industry content'
                  : 'Sync events'}
          </Button>

          {result && (
            <div
              className={`p-4 rounded ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <p
                className={`font-medium ${
                  result.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {result.success
                  ? `✅ Successfully synced ${result.synced} items`
                  : `❌ Sync failed: ${result.errors?.join(', ')}`}
              </p>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                  {result.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-100 dark:bg-zinc-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">How It Works</h2>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc list-inside">
            <li>
              <strong>Session catalog:</strong> Enter your session catalog or conference events URL. Events are stored by source. Sessions are organized by topic/interest and saved as Company Events so the AI can recommend relevant sessions.
            </li>
            <li>
              <strong>Industry Page:</strong> Enter the industry page URL and industry name (e.g. Automotive). All scraped content is tagged with that industry. Success stories, product announcements, and use cases are saved to your Content Library.
            </li>
            <li>
              <strong>Other events:</strong> Enter a different URL for webinars, conferences, or other event pages. These events are stored separately from the session catalog so you can filter by source.
            </li>
            <li>
              <strong>AI Chat:</strong> After syncing, you can ask e.g. &quot;Which sessions should I invite the VP of Autonomous Vehicles to?&quot; and the AI will recommend based on role, department, and industry.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
