import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { ContentType } from '@prisma/client';
import type { GetCompanySetupStateUser } from '@/app/actions/content-library-setup';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';
import { isServiceConfigured } from '@/lib/service-config';

type Props = {
  company: GetCompanySetupStateUser | null;
};

export async function ContentLibraryView({ company }: Props) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [contentCounts, catalogProductCount, industryPlaybookCount, schedules] =
    await Promise.all([
      prisma.contentLibrary.groupBy({
        by: ['type'],
        where: { userId: session.user.id, isActive: true },
        _count: { id: true },
      }),
      prisma.catalogProduct.count(),
      prisma.industryPlaybook.count({ where: { userId: session.user.id } }),
      prisma.contentCrawlSchedule.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { lastRunAt: true, nextRunAt: true },
        take: 5,
      }),
    ]);

  const countByType = Object.fromEntries(
    contentCounts.map((c) => [c.type, c._count.id])
  ) as Partial<Record<ContentType, number>>;
  const lastSync = schedules
    .map((s) => s.lastRunAt)
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() ?? 0) - (a?.getTime() ?? 0))[0];
  const firecrawlConfigured = isServiceConfigured('firecrawl');

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      {!firecrawlConfigured && <FirecrawlSetupCard />}

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Content Library
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Products, industry playbooks, use cases, and content so the AI can personalize outreach.
          </p>
          <Link
            href="/dashboard?skip_content_prompt=1"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-1 inline-block"
          >
            Go to Dashboard
          </Link>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href="/dashboard/content-library/import">
            <button className="px-4 py-2 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
              🌐 Import from URL
            </button>
          </Link>
          <Link href="/dashboard/content-library/sync-nvidia">
            <button className="px-4 py-2 border border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20">
              🌐 Scrape site
            </button>
          </Link>
          <Link href="/dashboard/content-library/import">
            <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">
              + Add Content
            </button>
          </Link>
        </div>
      </div>

      {/* Company Info card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Company info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Company</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {company?.companyName || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Website</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {company?.companyWebsite ? (
                <a
                  href={company.companyWebsite.startsWith('http') ? company.companyWebsite : `https://${company.companyWebsite}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {company.companyWebsite}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Primary industry (sell to)</dt>
            <dd className="text-gray-900 dark:text-gray-100">{company?.primaryIndustrySellTo || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Refresh</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {company?.contentRefreshFrequency || 'Manual'}
              {lastSync && ` · Last synced ${lastSync.toLocaleDateString()}`}
            </dd>
          </div>
        </dl>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link
          href="/dashboard/content-library?tab=products"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Products</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{catalogProductCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View · + Add</p>
        </Link>
        <Link
          href="/dashboard/content-library?tab=industries"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Industry playbooks</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{industryPlaybookCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View · + Add</p>
        </Link>
        <Link
          href="/dashboard/content-library/frameworks"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Frameworks</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{countByType.Framework ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View · + Add</p>
        </Link>
        <Link
          href="/dashboard/content-library/use-cases"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Use Cases</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{countByType.UseCase ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View · + Add</p>
        </Link>
        <Link
          href="/dashboard/content-library/case-studies"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Case Studies</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{countByType.SuccessStory ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View · + Add</p>
        </Link>
        <Link
          href="/dashboard/content-library/events"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Events</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{countByType.CompanyEvent ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View · + Add</p>
        </Link>
      </div>

      {/* Auto-Refresh card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-zinc-800/50 overflow-hidden px-5 py-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Keep content current</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Refresh case studies, use cases, and events so the agent can suggest the latest content.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/content-library/firecrawl"
            className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
          >
            Firecrawl: schedules & one-off crawls
          </Link>
          <Link
            href="/dashboard/content-library/sync-nvidia"
            className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
          >
            Sync events & industries (e.g. GTC)
          </Link>
          <Link
            href="/dashboard/messaging"
            className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
          >
            Messaging frameworks
          </Link>
        </div>
      </div>
    </div>
  );
}
