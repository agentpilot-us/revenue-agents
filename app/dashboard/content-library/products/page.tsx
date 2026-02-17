import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const products = await prisma.product.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { contentLibrary: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link
            href="/dashboard/content-library"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
          >
            ← Back to Content Library
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Products</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your products that power AI-generated content and outreach
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href="/dashboard/content-library/products/new">
            <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">
              + Add Product
            </button>
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-10 bg-white dark:bg-zinc-800 text-center">
          <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
            No products yet
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Add your products so the AI can personalize content and outreach. Each product can have
            associated frameworks, use cases, and case studies.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/content-library/products/new">
              <button className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium">
                + Add Product
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            return (
              <div
                key={product.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
              >
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                  {product.name}
                </h3>

                {product.category && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                      {product.category}
                    </span>
                  </div>
                )}

                {product.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>{product._count.contentLibrary} content items</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/content-library/products/${product.id}`} className="flex-1">
                    <button className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200">
                      View
                    </button>
                  </Link>
                  <Link href={`/dashboard/content-library/products/${product.id}/edit`}>
                    <button className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200">
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
