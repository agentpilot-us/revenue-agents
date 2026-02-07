import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const userId = session.user.id;

  // Fetch user's companies (created by them; later can add teamId)
  const companiesList = await prisma.company.findMany({
    where: { createdById: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { contacts: true, buyingGroups: true },
      },
    },
  });

  const companyIds = companiesList.map((c) => c.id);

  // Agent performance: aggregate from Activity and BuyingGroup for user's companies
  const [activityCounts, totalContacts, totalBuyingGroups] = await Promise.all([
    prisma.activity.groupBy({
      by: ['type'],
      where: { companyId: { in: companyIds } },
      _count: true,
    }),
    prisma.contact.count({ where: { companyId: { in: companyIds } } }),
    prisma.buyingGroup.count({ where: { companyId: { in: companyIds } } }),
  ]);

  const emailsSent =
    activityCounts.find((a: { type: string; _count: number }) => a.type === 'Email' || a.type === 'InMail')?._count ?? 0;
  const repliesReceived =
    activityCounts.find((a: { type: string; _count: number }) => a.type === 'EmailReply')?._count ?? 0;
  const buyingGroupDiscoveries =
    activityCounts.find((a: { type: string; _count: number }) => a.type === 'BuyingGroupDiscovery')?._count ?? 0;

  const recentActivities = await prisma.activity.findMany({
    where: { companyId: { in: companyIds } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div className="py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Success / Canceled messages (keep after checkout) */}
        {searchParams.success === 'true' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-green-900 mb-2">Payment successful</h2>
            <p className="text-green-800 text-sm">
              Your subscription is active. You can use the Account Expansion agent from any company below.
            </p>
          </div>
        )}
        {searchParams.canceled === 'true' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-yellow-900 mb-2">Payment canceled</h2>
            <p className="text-yellow-800 text-sm">No charges were made.</p>
            <Link href="/pricing" className="text-blue-600 hover:underline text-sm font-medium mt-2 inline-block">
              Return to Pricing
            </Link>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {session.user?.name || session.user?.email}. Your agents and performance.
          </p>
        </div>

        {/* Agent performance */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Contacts discovered</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalContacts}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Emails sent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{emailsSent}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Replies received</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{repliesReceived}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Buying groups</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalBuyingGroups}</p>
            </div>
          </div>
          {recentActivities.length > 0 && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent activity</h3>
              <ul className="space-y-2">
                {recentActivities.map((a: { id: string; type: string; summary: string; company: { name: string }; contact: { firstName: string | null; lastName: string | null } | null }) => (
                  <li key={a.id} className="text-sm text-gray-600 flex gap-2">
                    <span className="font-medium text-gray-500">{a.type}</span>
                    <span>{a.summary}</span>
                    <span className="text-gray-400">· {a.company.name}</span>
                    {a.contact && (
                      <span className="text-gray-400">
                        {a.contact.firstName} {a.contact.lastName}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Companies */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
            <Link
              href="/dashboard/companies/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add company
            </Link>
          </div>
          {companiesList.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-600 mb-4">No companies yet.</p>
              <p className="text-sm text-gray-500 mb-4">
                Add a company to run the Account Expansion agent and discover buying groups.
              </p>
              <Link
                href="/dashboard/companies/new"
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add company
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {companiesList.map((company: { id: string; name: string; domain: string | null; stage: string; tier: string | null; _count: { contacts: number; buyingGroups: number } }) => (
                <li key={company.id}>
                  <Link
                    href={`/dashboard/companies/${company.id}`}
                    className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{company.name}</p>
                        {company.domain && (
                          <p className="text-sm text-gray-500">{company.domain}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {company.stage}
                          {company.tier && ` · ${company.tier}`}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{company._count.contacts} contacts</p>
                        <p>{company._count.buyingGroups} buying groups</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Compact subscription / Billing link */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <Link href="/portal" className="text-sm text-blue-600 hover:text-blue-700">
            Manage subscription & Billing →
          </Link>
        </div>
      </div>
    </div>
  );
}
