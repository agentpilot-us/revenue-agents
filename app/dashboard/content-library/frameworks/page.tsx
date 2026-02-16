import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function FrameworksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const frameworks = await prisma.contentLibrary.findMany({
    where: {
      userId: session.user.id,
      type: 'Framework',
      isActive: true,
      archivedAt: null,
    },
    include: {
      product: {
        select: { name: true, category: true },
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Frameworks
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sales frameworks and messaging guides that help structure outreach
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href="/dashboard/content-library/import?type=Framework">
            <button className="px-4 py-2 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
              Import from URL
            </button>
          </Link>
          <Link href="/dashboard/content-library/frameworks/template">
            <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">
              + Add Framework
            </button>
          </Link>
        </div>
      </div>

      {frameworks.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-10 bg-white dark:bg-zinc-800 text-center">
          <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
            No frameworks yet
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Add sales frameworks and messaging guides. Import from a URL or create from a template.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/content-library/import?type=Framework">
              <button className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium">
                Import from URL
              </button>
            </Link>
            <Link href="/dashboard/content-library/frameworks/template">
              <button className="px-6 py-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700">
                Use template
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameworks.map((item) => {
            const contentJson = item.content as { valueProp?: string; description?: string } | null;
            const description = contentJson?.valueProp ?? contentJson?.description ?? 'No description';
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
                  {description}
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
      )}
    </div>
  );
}
