import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { ContentType } from '@prisma/client';
import type { GetCompanySetupStateUser } from '@/app/actions/content-library-setup';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';
import { isServiceConfigured } from '@/lib/service-config';
import { ContentLibraryActions } from '@/app/components/content-library/ContentLibraryActions';
import { ContentLibraryItemRow } from '@/app/components/content-library/ContentLibraryItemRow';

const SECTION_LABELS: Partial<Record<ContentType, string>> = {
  SuccessStory: 'Case studies',
  UseCase: 'Use cases',
  CompanyEvent: 'Events',
  Framework: 'Frameworks',
  FeatureRelease: 'Feature releases',
  ResourceLink: 'Resources',
  UploadedDocument: 'Uploaded files',
};

type Props = {
  company: GetCompanySetupStateUser | null;
};

export async function ContentLibraryView({ company }: Props) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [items, products, playbooks] = await Promise.all([
    prisma.contentLibrary.findMany({
      where: { userId: session.user.id, isActive: true, archivedAt: null },
      select: { id: true, title: true, type: true, sourceUrl: true, updatedAt: true, isPinned: true, version: true, previousContent: true },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.product.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, description: true, category: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.industryPlaybook.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, slug: true, overview: true, createdAt: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const byType = items.reduce(
    (acc, item) => {
      const type = item.type as ContentType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    },
    {} as Record<ContentType, typeof items>
  );

  const firecrawlConfigured = isServiceConfigured('firecrawl');

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      {!firecrawlConfigured && <FirecrawlSetupCard />}

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Your company data
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Pull data from your website or upload files. The AI uses this content to personalize outreach and value propositions.
          </p>
          <Link
            href="/dashboard?skip_content_prompt=1"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-1 inline-block"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>

      <ContentLibraryActions />

      {/* Company info */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Company info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Company</dt>
            <dd className="text-gray-900 dark:text-gray-100">{company?.companyName || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Website</dt>
            <dd className="text-gray-900 dark:text-gray-100">
              {company?.companyWebsite ? (
                <a
                  href={
                    company.companyWebsite.startsWith('http')
                      ? company.companyWebsite
                      : `https://${company.companyWebsite}`
                  }
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
        </dl>
      </div>

      {/* Sections by type */}
      <div className="space-y-6">
        {(
          [
            'SuccessStory',
            'UseCase',
            'CompanyEvent',
            'Framework',
            'FeatureRelease',
            'ResourceLink',
            'UploadedDocument',
          ] as ContentType[]
        ).map((type) => {
          const list = byType[type] ?? [];
          const label = SECTION_LABELS[type] ?? type;
          const canCreateManually = ['UseCase', 'CompanyEvent', 'Framework', 'FeatureRelease', 'ResourceLink'].includes(type);
          return (
            <div
              key={type}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{label}</h2>
                {canCreateManually && (
                  <Link
                    href={`/dashboard/content-library/new?type=${type}`}
                    className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Create new
                  </Link>
                )}
              </div>
              {list.length > 0 ? (
                <ul className="space-y-2">
                  {list.map((item) => (
                    <ContentLibraryItemRow
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      sourceUrl={item.sourceUrl}
                      updatedAt={item.updatedAt}
                      isPinned={item.isPinned}
                      version={item.version}
                      hasPreviousContent={!!item.previousContent}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No {label.toLowerCase()} yet.
                  {canCreateManually && (
                    <>
                      {' '}
                      <Link
                        href={`/dashboard/content-library/new?type=${type}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Create one
                      </Link>
                      .
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No content yet. Pull data from a URL or your site, or upload a file above.</p>
        </div>
      )}

      {/* Products Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Products</h2>
        </div>
        {products.length > 0 ? (
          <ul className="space-y-2">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50 dark:hover:bg-zinc-700/50"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                  {product.category && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({product.category})
                    </span>
                  )}
                  {product.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No products yet.</p>
        )}
      </div>

      {/* Industry Playbooks Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Industry Playbooks</h2>
        </div>
        {playbooks.length > 0 ? (
          <ul className="space-y-2">
            {playbooks.map((playbook) => (
              <li
                key={playbook.id}
                className="flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50 dark:hover:bg-zinc-700/50"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{playbook.name}</span>
                  {playbook.overview && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-1">
                      {playbook.overview}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No industry playbooks yet.</p>
        )}
      </div>
    </div>
  );
}
