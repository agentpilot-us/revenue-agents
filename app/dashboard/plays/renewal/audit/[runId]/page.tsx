import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { RenewalAuditExecution } from './RenewalAuditExecution';

export default async function RenewalAuditRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { runId } = await params;

  const play = await prisma.renewalPlay.findFirst({
    where: { id: runId },
    include: { company: { select: { id: true, name: true, userId: true } } },
  });

  if (!play || play.company.userId !== session.user.id) notFound();

  const renewalDate = new Date(play.renewalDate);
  const daysUntil = Math.ceil((renewalDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const healthCheckData = (play.healthCheckData as Record<string, unknown>) ?? null;
  const roiReport = (play.roiReport as Record<string, unknown>) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/plays/renewal/audit" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Proactive Renewal Audit
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-amber-50/50 px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900">Proactive Renewal Audit</h1>
            <p className="text-sm text-gray-600 mt-1">
              Account: <Link href={`/dashboard/companies/${play.company.id}`} className="text-amber-700 font-medium hover:underline">{play.company.name}</Link>
              {' | '}
              Renewal: {renewalDate.toLocaleDateString()} ({daysUntil} days)
            </p>
          </div>

          <RenewalAuditExecution
            playId={play.id}
            companyId={play.company.id}
            companyName={play.company.name}
            currentStep={play.currentStep}
            healthCheckData={healthCheckData}
            roiReport={roiReport}
          />
        </div>
      </div>
    </div>
  );
}
