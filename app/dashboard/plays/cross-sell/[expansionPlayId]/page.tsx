import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PlayStatus } from '@prisma/client';
import { CrossSellPlayExecution } from './CrossSellPlayExecution';

const STAGE_ORDER: PlayStatus[] = [
  PlayStatus.RESEARCH_PHASE,
  PlayStatus.OUTREACH,
  PlayStatus.FOLLOW_UP_NEEDED,
  PlayStatus.DEMO_SCHEDULED,
  PlayStatus.DISCOVERY_BOOKED,
  PlayStatus.NEGOTIATION,
  PlayStatus.WON,
  PlayStatus.LOST,
];

function stageToStep(status: PlayStatus): number {
  const i = STAGE_ORDER.indexOf(status);
  if (i <= 0) return 1;  // RESEARCH_PHASE
  if (i <= 2) return 2;  // OUTREACH, FOLLOW_UP
  if (i <= 4) return 3;  // DEMO, DISCOVERY
  if (i <= 5) return 4; // NEGOTIATION
  return 5;              // WON/LOST
}

export default async function CrossSellPlayPage({
  params,
}: {
  params: Promise<{ expansionPlayId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { expansionPlayId } = await params;

  const play = await prisma.expansionPlay.findFirst({
    where: { id: expansionPlayId },
    include: {
      company: { select: { id: true, name: true, userId: true } },
      companyDepartment: { select: { id: true, type: true, customName: true } },
      product: { select: { id: true, name: true } },
    },
  });

  if (!play || play.company.userId !== session.user.id) notFound();

  const deptName = play.companyDepartment.customName ?? play.companyDepartment.type.replace(/_/g, ' ');
  const opportunityStr = play.opportunitySize != null ? `$${Number(play.opportunitySize).toLocaleString()}` : null;
  const currentStep = stageToStep(play.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/plays/active" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Active Plays
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="border-b border-gray-200 bg-green-50/50 px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900">Department Cross-Sell Play</h1>
            <p className="text-sm text-gray-600 mt-1">
              Account: <Link href={`/dashboard/companies/${play.company.id}`} className="text-green-700 font-medium hover:underline">{play.company.name}</Link>
              {' | '}
              Dept: <Link href={`/dashboard/companies/${play.company.id}/departments/${play.companyDepartment.id}`} className="text-green-700 font-medium hover:underline">{deptName}</Link>
              {' | '}
              Product: {play.product.name}
              {opportunityStr && ` | Opportunity: ${opportunityStr}`}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Current stage: {play.status.replace(/_/g, ' ')} · Step {currentStep} of 5
            </p>
          </div>

          <CrossSellPlayExecution
            expansionPlayId={play.id}
            companyId={play.company.id}
            departmentId={play.companyDepartment.id}
            companyName={play.company.name}
            departmentName={deptName}
            productName={play.product.name}
            currentStep={currentStep}
            status={play.status}
            nextActionSummary={play.nextActionSummary}
            lastActionSummary={play.lastActionSummary}
          />
        </div>
      </div>
    </div>
  );
}
