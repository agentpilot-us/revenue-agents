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

  // Redirect content type tabs to dedicated pages (only these four have dedicated pages)
  const CONTENT_TAB_ROUTES: Record<string, string> = {
    Framework: '/dashboard/content-library/frameworks',
    UseCase: '/dashboard/content-library/use-cases',
    SuccessStory: '/dashboard/content-library/case-studies',
    CompanyEvent: '/dashboard/content-library/events',
  };
  if (tabParam && tabParam in CONTENT_TAB_ROUTES) {
    const path = CONTENT_TAB_ROUTES[tabParam];
    const redirectUrl = params.product ? `${path}?product=${params.product}` : path;
    redirect(redirectUrl);
  }

  // Only handle products/industries tabs here
  const hasTab = Boolean(tabParam && SPECIAL_TABS.includes(tabParam as SpecialTab));

  // ========================================
  // STATE-BASED ROUTING (early return each branch)
  // ========================================

  // State 1: Needs company info or no content yet
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

  // State 2: Import in progress
  if (state === 'importing' && latestImport) {
    return <ImportProgress importJob={latestImport} />;
  }

  // State 3: Needs review after import
  if (state === 'needs_review' && latestImport) {
    return <ReviewImportedContent importJob={latestImport} />;
  }

  // State 4: Ready, no tab — show overview (category cards that link to dedicated pages)
  if (state === 'ready' && !hasTab) {
    return <ContentLibraryView company={user} />;
  }

  // State 5: Ready with products/industries tab — show tabbed content list
  if (state !== 'ready') {
    return <ContentLibraryView company={user} />;
  }

  const selectedTab = tabParam!;
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
    </div>
  );
}
