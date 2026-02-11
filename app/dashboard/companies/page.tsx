import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function CompaniesListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const companies = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { contacts: true, activities: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-600 mt-1">
              Manage accounts and run expansion, partner, or referral plays from a company.
            </p>
          </div>
          <Link
            href="/dashboard/companies/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Add company
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600 mb-4">No companies yet. Add one to launch the expansion agent and send emails.</p>
            <Link
              href="/dashboard/companies/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Add your first company
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {companies.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/dashboard/companies/${company.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{company.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {company.domain ?? 'No domain'} · {company.industry ?? 'No industry'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {company._count.contacts} contacts · {company._count.activities} activities
                      </p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
