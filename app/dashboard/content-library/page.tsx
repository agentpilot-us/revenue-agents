import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ContentType } from '@prisma/client';
import { getCompanySetupState } from '@/app/actions/content-library-setup';
import { CompanyBasicInfoForm } from '@/app/components/content-library/CompanyBasicInfoForm';
import { ImportProgress } from '@/app/components/content-library/ImportProgress';
import { ReviewImportedContent } from '@/app/components/content-library/ReviewImportedContent';
import { ContentLibraryView } from '@/app/components/content-library/ContentLibraryView';
import { ContentLibraryProductsTab } from '@/app/dashboard/content-library/ContentLibraryProductsTab';
import { ContentLibraryIndustriesTab } from '@/app/dashboard/content-library/ContentLibraryIndustriesTab';
import { ContentLibraryGettingStarted } from '@/app/dashboard/content-library/ContentLibraryGettingStarted';
import { FirecrawlSetupCard } from '@/app/components/FirecrawlSetupCard';
import { isServiceConfigured } from '@/lib/service-config';

const CONTENT_TABS: ContentType[] = [
  'Framework',
  'UseCase',
  'SuccessStory',
  'CompanyEvent',
];

const SPECIAL_TABS = ['products', 'industries'] as const;
type SpecialTab = (typeof SPECIAL_TABS)[number];

/** Tab-specific empty state copy and primary CTA */
const EMPTY_STATE_BY_TAB: Partial<
  Record<
    string,
    { title: string; description: string; primaryHref: string; primaryLabel: string; secondaryHref: string; secondaryLabel: string }
  >
> = {
  Framework: {
    title: 'No frameworks yet',
    description: 'Add sales frameworks and messaging guides. Import from a URL or paste content to extract structure.',
    primaryHref: '/dashboard/content-library/import',
    primaryLabel: 'Import from URL',
    secondaryHref: '/dashboard/content-library/import',
    secondaryLabel: 'Paste text to extract',
  },
  UseCase: {
    title: 'No use cases yet',
    description: 'Add use cases that match the industries you sell to. Import from URL or add manually—you can add many.',
    primaryHref: '/dashboard/content-library/import?type=UseCase',
    primaryLabel: 'Import from URL',
    secondaryHref: '/dashboard/content-library/import?type=UseCase',
    secondaryLabel: 'Add manually',
  },
  SuccessStory: {
    title: 'No case studies yet',
    description: 'Add customer success stories the AI can reference in outreach. Import from URL or add manually—add many.',
    primaryHref: '/dashboard/content-library/import?type=SuccessStory',
    primaryLabel: 'Import from URL',
    secondaryHref: '/dashboard/content-library/import?type=SuccessStory',
    secondaryLabel: 'Add manually',
  },
  CompanyEvent: {
    title: 'No events yet',
    description: 'Add events with a name and URL for details/sessions, or scrape GTC/other event sites.',
    primaryHref: '/dashboard/content-library/events/add',
    primaryLabel: 'Add event (name + URL)',
    secondaryHref: '/dashboard/content-library/sync-nvidia',
    secondaryLabel: 'Scrape site (GTC or events)',
  },
};

export default async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const setup = await getCompanySetupState();
  if (!setup.ok) {
    redirect('/login');
  }

  const { state, user, latestImport } = setup;
  const params = await searchParams;
  const tabParam = params.tab;
  const hasTab = Boolean(tabParam && (SPECIAL_TABS.includes(tabParam as SpecialTab) || CONTENT_TABS.includes(tabParam as ContentType)));

  // State-based routing: show form, import progress, review, or library
  if (state === 'needs_company_info' || state === 'needs_content') {
    const failedError =
      state === 'needs_content' &&
      latestImport?.status === 'FAILED' &&
      latestImport?.errors &&
      typeof latestImport.errors === 'object' &&
      'error' in latestImport.errors
        ? String((latestImport.errors as { error?: string }).error)
        : undefined;
    const message =
      failedError ||
      (state === 'needs_content'
        ? 'You have no content yet. Start a smart import to discover pages from your website.'
        : undefined);
    return (
      <CompanyBasicInfoForm
        existingData={user}
        message={message}
        skipToImport={state === 'needs_content'}
      />
    );
  }

  if (state === 'importing' && latestImport) {
    return <ImportProgress importJob={latestImport} />;
  }

  if (state === 'needs_review' && latestImport) {
    return <ReviewImportedContent importJob={latestImport} />;
  }

  // state === 'ready': show overview when no tab, or tabbed list when tab is set
  if (state === 'ready' && !hasTab) {
    return <ContentLibraryView company={user} />;
  }

  // state === 'ready' and tab is set: show existing tabbed content list
  const selectedTab = hasTab
    ? tabParam!
    : 'Framework';
  const isSpecialTab = SPECIAL_TABS.includes(selectedTab as SpecialTab);
  const selectedProduct = params.product;

  const products = await prisma.product.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { contentLibrary: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const content =
    !isSpecialTab && CONTENT_TABS.includes(selectedTab as ContentType)
      ? await prisma.contentLibrary.findMany({
          where: {
            userId: session.user.id,
            ...(selectedProduct && { productId: selectedProduct }),
            type: selectedTab as ContentType,
            isActive: true,
            archivedAt: null,
          },
          include: {
            product: {
              select: { name: true, category: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

  const catalogProducts =
    selectedTab === 'products'
      ? await prisma.catalogProduct.findMany({
          orderBy: { name: 'asc' },
          include: {
            productProfiles: {
              where: { userId: session.user.id },
              select: { id: true, updatedAt: true },
            },
          },
        })
      : [];

  const industryPlaybooks =
    selectedTab === 'industries'
      ? await prisma.industryPlaybook.findMany({
          where: { userId: session.user.id },
          orderBy: { name: 'asc' },
        })
      : [];

  const catalogProductsForIndustries =
    selectedTab === 'industries'
      ? await prisma.catalogProduct.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      : [];

  const successStoriesForLinking =
    selectedTab === 'products'
      ? await prisma.contentLibrary.findMany({
          where: {
            userId: session.user.id,
            type: 'SuccessStory',
            isActive: true,
          },
          select: { id: true, title: true },
          orderBy: { title: 'asc' },
          take: 100,
        })
      : [];

  const [contentCounts, catalogProductCount, industryPlaybookCount] = await Promise.all([
    prisma.contentLibrary.groupBy({
      by: ['type'],
      where: { userId: session.user.id, isActive: true },
      _count: { id: true },
    }),
    prisma.catalogProduct.count(),
    prisma.industryPlaybook.count({ where: { userId: session.user.id } }),
  ]);
  const countByType = Object.fromEntries(
    contentCounts.map((c) => [c.type, c._count.id])
  ) as Partial<Record<ContentType, number>>;
  const gettingStartedCounts = {
    products: catalogProductCount,
    industries: industryPlaybookCount,
    useCases: countByType.UseCase ?? 0,
    caseStudies: countByType.SuccessStory ?? 0,
    events: countByType.CompanyEvent ?? 0,
    frameworks: countByType.Framework ?? 0,
  };

  const needsReview = Array.isArray(content)
    ? content.filter((c) => !c.userConfirmed && c.confidenceScore === 'low').length
    : 0;

  const firecrawlConfigured = isServiceConfigured('firecrawl');

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      {!firecrawlConfigured && <FirecrawlSetupCard />}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Content Library</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Products, industry playbooks, use cases, and content so the AI can personalize outreach and recommend the right sessions.
          </p>
          <Link
            href="/dashboard/content-library"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-1 inline-block"
          >
            Overview
          </Link>
          {needsReview > 0 && (
            <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">
              ⚠️ {needsReview} items need tag confirmation
            </p>
          )}
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

      <ContentLibraryGettingStarted counts={gettingStartedCounts} />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-zinc-800/50 overflow-hidden mb-6 px-5 py-4">
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

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Product:</label>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/dashboard/content-library?tab=${selectedTab}`}>
            <button
              className={`px-4 py-2 rounded ${
                !selectedProduct
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200'
              }`}
            >
              All Products
            </button>
          </Link>
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/dashboard/content-library?product=${product.id}&tab=${selectedTab}`}
            >
              <button
                className={`px-4 py-2 rounded ${
                  selectedProduct === product.id
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200'
                }`}
              >
                {product.name} ({product._count.contentLibrary})
              </button>
            </Link>
          ))}
          <Link href="/dashboard/content-library/products/new">
            <button className="px-4 py-2 border border-dashed border-gray-400 dark:border-zinc-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
              + Add Product
            </button>
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-zinc-700 mb-6">
        <nav className="flex gap-6 flex-wrap">
          <Link href="/dashboard/content-library?tab=products">
            <button
              className={`px-4 py-3 border-b-2 font-medium ${
                selectedTab === 'products'
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Products
            </button>
          </Link>
          <Link href="/dashboard/content-library?tab=industries">
            <button
              className={`px-4 py-3 border-b-2 font-medium ${
                selectedTab === 'industries'
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Industries
            </button>
          </Link>
          {CONTENT_TABS.map((tab) => (
            <Link
              key={tab}
              href={`/dashboard/content-library?${selectedProduct ? `product=${selectedProduct}&` : ''}tab=${tab}`}
            >
              <button
                className={`px-4 py-3 border-b-2 font-medium ${
                  selectedTab === tab
                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'Framework' && 'Frameworks'}
                {tab === 'UseCase' && 'Use Cases'}
                {tab === 'SuccessStory' && 'Case Studies'}
                {tab === 'CompanyEvent' && 'Events'}
              </button>
            </Link>
          ))}
        </nav>
      </div>

      {selectedTab === 'products' && (
        <ContentLibraryProductsTab
          catalogProducts={catalogProducts.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            hasProfile: p.productProfiles.length > 0,
            profileUpdatedAt: p.productProfiles[0]?.updatedAt?.toISOString() ?? null,
          }))}
          successStories={successStoriesForLinking}
        />
      )}

      {selectedTab === 'industries' && (
        <ContentLibraryIndustriesTab
          playbooks={industryPlaybooks.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            overview: p.overview,
            departmentProductMapping: p.departmentProductMapping as unknown[] | null,
            valuePropsByDepartment: p.valuePropsByDepartment as Record<string, unknown> | null,
            buyingCommittee: p.buyingCommittee,
            landmines: p.landmines as string[] | null,
            relevantCaseStudyIds: p.relevantCaseStudyIds as string[] | null,
            updatedAt: p.updatedAt.toISOString(),
          }))}
          catalogProducts={catalogProductsForIndustries}
        />
      )}

      {!isSpecialTab && content.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-10 bg-white dark:bg-zinc-800">
          {(() => {
            const empty = EMPTY_STATE_BY_TAB[selectedTab as string] ?? {
              title: `No ${(selectedTab as string).replace(/([A-Z])/g, ' $1').toLowerCase().trim()}s yet`,
              description: 'Import from a URL or add content manually to get started.',
              primaryHref: '/dashboard/content-library/import',
              primaryLabel: 'Import from URL',
              secondaryHref: '/dashboard/content-library/import',
              secondaryLabel: 'Add manually',
            };
            return (
              <>
                <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {empty.title}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg">
                  {empty.description}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href={empty.primaryHref}>
                    <button className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium">
                      {empty.primaryLabel}
                    </button>
                  </Link>
                  <Link href={empty.secondaryHref}>
                    <button className="px-6 py-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700">
                      {empty.secondaryLabel}
                    </button>
                  </Link>
                </div>
              </>
            );
          })()}
        </div>
      ) : !isSpecialTab ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => {
            const contentJson = item.content as { valueProp?: string } | null;
            const valueProp = contentJson?.valueProp ?? 'No description';
            const versionLabel = item.version ? ` v${item.version}` : '';
            return (
              <div
                key={item.id}
                className={`border rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-zinc-800 ${
                  !item.userConfirmed && item.confidenceScore === 'low'
                    ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-zinc-700'
                }`}
              >
                {!item.userConfirmed && (
                  <div className="mb-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        item.confidenceScore === 'high'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : item.confidenceScore === 'medium'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {item.confidenceScore === 'high' && '✓ High Confidence'}
                      {item.confidenceScore === 'medium' && '~ Medium Confidence'}
                      {item.confidenceScore === 'low' && '⚠️ Needs Review'}
                    </span>
                  </div>
                )}

                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                  {item.title}{versionLabel}
                </h3>

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.industry && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                      🏢 {item.industry}
                    </span>
                  )}
                  {item.department && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                      🏛️ {item.department}
                    </span>
                  )}
                  {item.persona && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                      👤 {item.persona}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {valueProp}
                </p>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>📦 {item.product.name}</span>
                  {item.sourceUrl && <span>• 🌐 Imported</span>}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/content-library/${item.id}`}
                    className="flex-1"
                  >
                    <button className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200">
                      {!item.userConfirmed ? 'Review' : 'View'}
                    </button>
                  </Link>
                  <Link href={`/dashboard/content-library/${item.id}/edit`}>
                    <button className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200">
                      ✏️
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
