import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function CompanyBuyingGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, createdById: session.user.id },
  });
  if (!company) notFound();

  const buyingGroups = await prisma.buyingGroup.findMany({
    where: { companyId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { members: true } },
      template: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <Link href={`/dashboard/companies/${id}`} className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
        ← Back to {company.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Buying groups</h1>
      <p className="text-gray-500 mb-8">Discovered committees for {company.name}</p>

      {buyingGroups.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p>No buying groups yet.</p>
          <p className="text-sm mt-2">Use the Account Expansion agent on the company page to discover buying groups.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {buyingGroups.map((bg) => (
            <li key={bg.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{bg.customName}</p>
                  <p className="text-sm text-gray-500">
                    {bg.contactsFound} contacts · {bg.personasSearched} personas
                    {bg.template && ` · Template: ${bg.template.name}`}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {bg.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{bg._count.members} members</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
