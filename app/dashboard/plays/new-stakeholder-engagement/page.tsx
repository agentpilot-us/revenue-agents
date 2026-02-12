import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { NewStakeholderStartForm } from './NewStakeholderStartForm';

export default async function NewStakeholderEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; departmentId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const params = await searchParams;
  const initialCompanyId = params.companyId ?? '';

  const [companies, activePlays] = await Promise.all([
    prisma.company.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.stakeholderEngagementPlay.findMany({
      where: { company: { userId: session.user.id } },
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/plays" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Play Library
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">New Stakeholder Engagement</h1>
        <p className="text-gray-600 mb-6">
          Trigger: new VP/Director/C-level joins a tracked account. Select the account and the new stakeholder contact to start the play.
        </p>

        <NewStakeholderStartForm companies={companies} initialCompanyId={initialCompanyId} />

        {activePlays.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent runs</h2>
            <ul className="space-y-2">
              {activePlays.map((play) => {
                const name = [play.contact.firstName, play.contact.lastName].filter(Boolean).join(' ') || 'Unknown';
                return (
                  <li key={play.id}>
                    <Link
                      href={`/dashboard/plays/new-stakeholder-engagement/${play.id}`}
                      className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-amber-400 hover:bg-amber-50/30"
                    >
                      <span className="font-medium text-gray-900">{play.company.name}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-gray-700">{name}</span>
                      {play.contact.title && (
                        <span className="text-gray-500 text-sm ml-2">({play.contact.title})</span>
                      )}
                      <span className="text-xs text-gray-400 ml-2">Step {play.currentStep}/5</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
