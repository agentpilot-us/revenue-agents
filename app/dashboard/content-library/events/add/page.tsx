'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddEventPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; synced?: number; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !url.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/content-library/sync-nvidia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'other-events',
          eventsUrl: url.trim(),
          eventSourceName: eventName.trim() || 'Event',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add event');
      setResult({ success: true, synced: data.synced });
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add event',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/content-library?tab=CompanyEvent"
        className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        ← Back to Events
      </Link>

      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Add event (name + URL)
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Enter the event name and the URL where we can get details and sessions. We’ll scrape the page and add the events to your library.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-800 rounded-lg p-6 border border-gray-200 dark:border-zinc-700">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
            Event name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. GTC 2025, Webinar Series"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
            URL to get details and sessions
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/events/sessions"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {submitting ? 'Fetching events...' : 'Add event'}
          </button>
          <Link href="/dashboard/content-library?tab=CompanyEvent">
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
            <p className="text-green-800 dark:text-green-200 font-medium">
              Added {result.synced ?? 0} event(s).{' '}
              <Link href="/dashboard/content-library?tab=CompanyEvent" className="underline">
                View events
              </Link>
            </p>
          ) : (
            <p className="text-red-800 dark:text-red-200">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
