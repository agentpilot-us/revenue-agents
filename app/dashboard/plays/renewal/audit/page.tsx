import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { RenewalAuditStart } from './RenewalAuditStart';

export default async function ProactiveRenewalAuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const now = new Date();
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);
  const in120 = new Date(now);
  in120.setDate(in120.getDate() + 120);

  const companiesWithRenewal = await prisma.company.findMany({
    where: {
      userId: session.user.id,
      companyProducts: {
        some: {
          contractEnd: { gte: in90, lte: in120 },
          status: 'ACTIVE',
        },
      },
    },
    select: {
      id: true,
      name: true,
      companyProducts: {
        where: { contractEnd: { gte: in90, lte: in120 }, status: 'ACTIVE' },
        select: { contractEnd: true, product: { select: { name: true } } },
      },
    },
  });

  const allCompanies = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const activePlays = await prisma.renewalPlay.findMany({
    where: { company: { userId: session.user.id }, status: 'active' },
    include: { company: { select: { name: true } } },
    orderBy: { renewalDate: 'asc' },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/plays" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Play Library
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Proactive Renewal Audit (90-Day)</h1>
        <p className="text-gray-600 mb-6">
          Trigger: contract renewal within 90–120 days. Start a renewal play for an account to run health check, ROI report, champion check-in, and competitor signals.
        </p>

        <RenewalAuditStart
          companiesWithRenewal={companiesWithRenewal.map((c) => ({
            id: c.id,
            name: c.name,
            renewalDate: c.companyProducts[0]?.contractEnd,
            productName: c.companyProducts[0]?.product.name,
          }))}
          allCompanies={allCompanies}
        />

        {activePlays.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Active renewal plays</h2>
            <ul className="space-y-2">
              {activePlays.map((play) => (
                <li key={play.id}>
                  <Link
                    href={`/dashboard/plays/renewal/audit/${play.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-amber-400"
                  >
                    <span className="font-medium">{play.company.name}</span>
                    <span className="text-gray-500 ml-2">
                      Renewal: {new Date(play.renewalDate).toLocaleDateString()} · Step {play.currentStep}/5
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
