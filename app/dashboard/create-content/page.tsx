import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function CreateContentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const companies = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, domain: true },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create content</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Generate email, LinkedIn, or custom copy for your marketing automation. Select a company to use its account intelligence and your content library.
        </p>

        {companies.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">Add a company first to create content with account context.</p>
            <Link
              href="/dashboard/companies/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Add company
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {companies.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/dashboard/companies/${company.id}/create-content`}
                  className="block rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-sm transition-colors"
                >
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{company.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {company.domain ?? 'No domain'}
                  </p>
                  <span className="text-sm text-blue-600 dark:text-blue-400 mt-2 inline-block">
                    Create content for this company →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
