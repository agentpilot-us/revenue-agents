import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DepartmentsTab } from '@/app/components/company/DepartmentsTab';
import { ProductPenetrationMatrix } from '@/app/components/company/ProductPenetrationMatrix';

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  type CompanyWithRelations = {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    contacts: Array<{ id: string }>;
    activities: Array<{ id: string; type: string; summary: string; createdAt: Date }>;
  };
  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contacts: { select: { id: true } },
      activities: { orderBy: { createdAt: 'desc' } },
    },
  }) as CompanyWithRelations | null;

  if (!company) notFound();

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    include: {
      _count: { select: { contacts: true, activities: true } },
      companyProducts: {
        select: { id: true, status: true, opportunitySize: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const matrixDepartments = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    include: {
      companyProducts: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, priceMin: true, priceMax: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const catalogProducts = await prisma.catalogProduct.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, priceMin: true, priceMax: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard/companies"
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Companies
        </Link>

        {/* Company Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
          <p className="text-gray-600">{company.domain ?? '—'}</p>
          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            <span>Industry: {company.industry || 'Not specified'}</span>
            <span>•</span>
            <span>{company.contacts.length} contacts</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>

          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚀 Launch Account Expansion Play
            </h3>
            <p className="text-gray-600 mb-4">
              Chat with AI agent to:
            </p>
            <ul className="text-sm text-gray-700 space-y-2 mb-4">
              <li>• Find contacts by role or department</li>
              <li>• Enrich contacts with business emails</li>
              <li>• Research company news and priorities</li>
              <li>• Draft personalized outreach emails</li>
              <li>• Track engagement (opens, clicks, replies)</li>
            </ul>
            <Link
              href={`/chat?play=expansion&accountId=${company.id}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Launch Chat →
            </Link>
          </div>

          <Link
            href={`/dashboard/companies/${company.id}/contacts`}
            className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold mb-2">
              📊 View Contact Engagement
            </h3>
            <p className="text-gray-600">
              See opens, clicks, replies by contact
            </p>
          </Link>
        </div>

        {/* Departments */}
        <div className="mb-6">
          <DepartmentsTab companyId={company.id} departments={departments} />
        </div>

        {/* Product Penetration Matrix */}
        <div className="mb-6">
          <ProductPenetrationMatrix
            data={{
              companyId: company.id,
              departments: matrixDepartments,
              products: catalogProducts,
            }}
          />
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Agent Activity</h2>
          <div className="bg-white rounded-lg shadow divide-y">
            {company.activities.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                No activity yet. Launch a play to get started.
              </div>
            ) : (
              company.activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="p-4">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">
                      {activity.type === 'Email' ? '📧' :
                        activity.type === 'Research' ? '🔍' :
                          activity.type === 'ContactDiscovered' ? '👥' : '📝'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{activity.summary}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Engagement Summary */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Engagement Summary</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 mb-4">This Month:</p>
            <ul className="space-y-2 text-gray-700">
              <li>• {company.contacts.length} total contacts</li>
              <li>• {company.activities.filter((a) => a.type === 'Email').length} emails sent</li>
              <li>• {company.activities.filter((a) => a.type === 'EmailReply').length} replies received</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
