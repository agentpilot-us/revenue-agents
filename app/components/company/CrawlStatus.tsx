'use client';

type Props = {
  lastCrawlAt: Date | null;
  nextCrawlAt: Date | null;
  lastContentChangeAt: Date | null;
};

export function CrawlStatus({
  lastCrawlAt,
  nextCrawlAt,
  lastContentChangeAt,
}: Props) {
  if (!lastCrawlAt && !nextCrawlAt && !lastContentChangeAt) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Nightly Crawl Status</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">No crawl schedule configured.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Nightly Crawl Status</h2>
      <div className="space-y-3 text-sm">
        {lastCrawlAt && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Last crawl:</span>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(lastCrawlAt).toLocaleString()}
            </span>
          </div>
        )}
        {nextCrawlAt && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Next scheduled crawl:</span>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(nextCrawlAt).toLocaleString()}
            </span>
          </div>
        )}
        {lastContentChangeAt && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Last change detected:</span>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(lastContentChangeAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
