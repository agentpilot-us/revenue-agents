import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ContentType } from '@prisma/client';

const CONTENT_TABS: ContentType[] = [
  'Framework',
  'UseCase',
  'SuccessStory',
  'Persona',
  'Battlecard',
];

export default async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const tabParam = params.tab ?? 'Framework';
  const selectedTab = CONTENT_TABS.includes(tabParam as ContentType)
    ? (tabParam as ContentType)
    : 'Framework';
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

  const content = await prisma.contentLibrary.findMany({
    where: {
      userId: session.user.id,
      ...(selectedProduct && { productId: selectedProduct }),
      type: selectedTab,
      isActive: true,
    },
    include: {
      product: {
        select: { name: true, category: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const needsReview = content.filter(
    (c) => !c.userConfirmed && c.confidenceScore === 'low'
  ).length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Content Library</h1>
          <p className="text-gray-600">
            Product marketing content organized by industry, department, and
            persona
          </p>
          {needsReview > 0 && (
            <p className="text-amber-600 text-sm mt-2">
              ⚠️ {needsReview} items need tag confirmation
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/content-library/import">
            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
              🌐 Import from URL
            </button>
          </Link>
          <Link href="/dashboard/content-library/new">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              + Add Content
            </button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Product:</label>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/content-library">
            <button
              className={`px-4 py-2 rounded ${
                !selectedProduct
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
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
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {product.name} ({product._count.contentLibrary})
              </button>
            </Link>
          ))}
          <Link href="/dashboard/content-library/products/new">
            <button className="px-4 py-2 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50">
              + Add Product
            </button>
          </Link>
        </div>
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {CONTENT_TABS.map((tab) => (
            <Link
              key={tab}
              href={`/dashboard/content-library?${selectedProduct ? `product=${selectedProduct}&` : ''}tab=${tab}`}
            >
              <button
                className={`px-4 py-3 border-b-2 font-medium ${
                  selectedTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'Framework' && '📋 Frameworks'}
                {tab === 'UseCase' && '💡 Use Cases'}
                {tab === 'SuccessStory' && '📊 Success Stories'}
                {tab === 'Persona' && '👤 Personas'}
                {tab === 'Battlecard' && '⚔️ Battlecards'}
              </button>
            </Link>
          ))}
        </nav>
      </div>

      {content.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-xl font-medium text-gray-400 mb-4">
            No {selectedTab.toLowerCase()}s yet
          </p>
          <p className="text-gray-500 mb-6">
            Import from product pages or add content manually
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard/content-library/import">
              <button className="px-6 py-3 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                🌐 Import from URL
              </button>
            </Link>
            <Link href="/dashboard/content-library/new">
              <button className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
                + Add Manually
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => {
            const contentJson = item.content as { valueProp?: string } | null;
            const valueProp = contentJson?.valueProp ?? 'No description';
            return (
              <div
                key={item.id}
                className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${
                  !item.userConfirmed && item.confidenceScore === 'low'
                    ? 'border-amber-300 bg-amber-50'
                    : ''
                }`}
              >
                {!item.userConfirmed && (
                  <div className="mb-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        item.confidenceScore === 'high'
                          ? 'bg-green-100 text-green-700'
                          : item.confidenceScore === 'medium'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.confidenceScore === 'high' && '✓ High Confidence'}
                      {item.confidenceScore === 'medium' &&
                        '~ Medium Confidence'}
                      {item.confidenceScore === 'low' && '⚠️ Needs Review'}
                    </span>
                  </div>
                )}

                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.industry && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      🏢 {item.industry}
                    </span>
                  )}
                  {item.department && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      🏛️ {item.department}
                    </span>
                  )}
                  {item.persona && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      👤 {item.persona}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {valueProp}
                </p>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <span>📦 {item.product.name}</span>
                  {item.sourceUrl && <span>• 🌐 Imported</span>}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/content-library/${item.id}`}
                    className="flex-1"
                  >
                    <button className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      {!item.userConfirmed ? 'Review' : 'View'}
                    </button>
                  </Link>
                  <Link href={`/dashboard/content-library/${item.id}/edit`}>
                    <button className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      ✏️
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
