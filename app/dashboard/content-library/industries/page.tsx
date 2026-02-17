import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function IndustriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const industryPlaybooks = await prisma.industryPlaybook.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
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
            Industry Playbooks
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Industry-specific playbooks that map departments to products and define value props
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href="/dashboard/content-library/industries/new">
            <button className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">
              + Add Industry Playbook
            </button>
          </Link>
        </div>
      </div>

      {industryPlaybooks.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-10 bg-white dark:bg-zinc-800 text-center">
          <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
            No industry playbooks yet
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Add industry playbooks to map departments to products and set industry-specific messaging.
            The AI uses the playbook matching the account&apos;s industry.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/content-library/industries/new">
              <button className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium">
                + Add Industry Playbook
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industryPlaybooks.map((playbook) => {
            return (
              <div
                key={playbook.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
              >
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                  {playbook.name}
                </h3>

                {playbook.slug && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{playbook.slug}</p>
                )}

                {playbook.overview && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {playbook.overview}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>Updated {new Date(playbook.updatedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/content-library/industries/${playbook.id}`}
                    className="flex-1"
                  >
                    <button className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200">
                      View
                    </button>
                  </Link>
                  <Link href={`/dashboard/content-library/industries/${playbook.id}/edit`}>
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
