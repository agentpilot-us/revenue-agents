import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, createdById: session.user.id },
    include: {
      _count: { select: { contacts: true, buyingGroups: true } },
    },
  });

  if (!company) notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
        ← Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
        {company.domain && (
          <p className="text-gray-500">{company.domain}</p>
        )}
        <p className="text-sm text-gray-400 mt-1">
          {company.stage}
          {company.tier && ` · ${company.tier}`}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {company._count.contacts} contacts · {company._count.buyingGroups} buying groups
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href={`/dashboard/companies/${company.id}/buying-groups`}
          className="block rounded-lg border border-gray-200 bg-white p-6 hover:border-blue-300 hover:shadow-sm"
        >
          <h2 className="font-semibold text-gray-900">Buying groups</h2>
          <p className="text-sm text-gray-500 mt-1">
            View and manage buying groups for this company.
          </p>
        </Link>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Account Expansion agent</h2>
          <p className="text-sm text-gray-500 mt-1">
            Chat with the agent to discover buying groups, research the account, and run outreach.
          </p>
          <p className="text-sm text-amber-600 mt-2">
            Chat UI will be added when the expansion API and Arcade are connected.
          </p>
        </div>
      </div>
    </div>
  );
}
