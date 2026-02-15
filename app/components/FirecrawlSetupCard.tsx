'use client';

/**
 * Shown when Firecrawl is not configured. Walks the user through getting an API key
 * and adding it to .env.local so Import from URL and Scrape site work.
 */
export function FirecrawlSetupCard() {
  return (
    <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden mb-6">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🌐</span>
          <div>
            <h2 className="font-semibold text-amber-900 dark:text-amber-100">
              Set up Firecrawl to enable Import & Sync
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              <strong>Import from URL</strong> and <strong>Scrape site</strong> need a scraping service to fetch web pages.
              Follow these steps to get it working:
            </p>
            <ol className="mt-4 space-y-3 list-decimal list-inside text-sm text-amber-900 dark:text-amber-100">
              <li>
                <strong>Get an API key</strong> — Sign up at{' '}
                <a
                  href="https://www.firecrawl.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                >
                  firecrawl.dev
                </a>
                , then go to API Keys and create one. Keys usually start with <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-xs">fc-</code>.
              </li>
              <li>
                <strong>Add to your environment</strong> — In your project root, open or create <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-xs">.env.local</code> and add:
                <pre className="mt-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-xs overflow-x-auto">
                  FIRECRAWL_API_KEY="fc-your-api-key-here"
                </pre>
              </li>
              <li>
                <strong>Restart the dev server</strong> — Stop <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-xs">npm run dev</code> (Ctrl+C) and run it again so the new variable is loaded.
              </li>
            </ol>
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              After that, &quot;Import from URL&quot; and &quot;Scrape site&quot; will work. You can also check status under Settings → Services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
