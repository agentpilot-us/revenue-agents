import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PlayStatus, DepartmentType } from '@prisma/client';
import { Button } from '@/components/ui/button';

const PLAY_STATUS_LABELS: Record<PlayStatus, string> = {
  [PlayStatus.RESEARCH_PHASE]: 'Research phase',
  [PlayStatus.OUTREACH]: 'Outreach',
  [PlayStatus.FOLLOW_UP_NEEDED]: 'Follow-up needed',
  [PlayStatus.DEMO_SCHEDULED]: 'Demo scheduled',
  [PlayStatus.DISCOVERY_BOOKED]: 'Discovery call booked',
  [PlayStatus.NEGOTIATION]: 'Negotiation',
  [PlayStatus.WON]: 'Won',
  [PlayStatus.LOST]: 'Lost',
};

const DEPARTMENT_TYPE_GROUP: Record<DepartmentType, string> = {
  [DepartmentType.MANUFACTURING_OPERATIONS]: 'Manufacturing',
  [DepartmentType.INDUSTRIAL_DESIGN]: 'Design',
  [DepartmentType.AUTONOMOUS_VEHICLES]: 'Autonomous Vehicles',
  [DepartmentType.IT_DATA_CENTER]: 'IT / Data Center',
  [DepartmentType.SALES]: 'Sales',
  [DepartmentType.MARKETING]: 'Marketing',
  [DepartmentType.CUSTOMER_SUCCESS]: 'Customer Success',
  [DepartmentType.REVENUE_OPERATIONS]: 'Revenue Operations',
  [DepartmentType.PRODUCT]: 'Product',
  [DepartmentType.ENGINEERING]: 'Engineering',
  [DepartmentType.SUPPLY_CHAIN]: 'Supply Chain',
  [DepartmentType.CONNECTED_SERVICES]: 'Connected Services',
  [DepartmentType.EXECUTIVE_LEADERSHIP]: 'Executive',
  [DepartmentType.FINANCE]: 'Finance',
  [DepartmentType.LEGAL]: 'Legal',
  [DepartmentType.HR]: 'HR',
  [DepartmentType.OTHER]: 'Other',
};

const SECTION_ICONS: Record<string, string> = {
  Manufacturing: '🏭',
  Design: '🎨',
  'Autonomous Vehicles': '🚗',
  'IT / Data Center': '💻',
};

export default async function ActivePlaysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const [plays, useCasePlays] = await Promise.all([
    prisma.expansionPlay.findMany({
      where: {
        company: { userId: session.user.id },
        status: { notIn: [PlayStatus.WON, PlayStatus.LOST] },
      },
      include: {
        company: { select: { id: true, name: true } },
        companyDepartment: { select: { id: true, type: true, customName: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: [{ nextActionDue: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.useCaseExplorationPlay.findMany({
      where: {
        company: { userId: session.user.id },
        playState: { notIn: ['completed', 'cancelled'] },
      },
      include: {
        company: { select: { id: true, name: true } },
        companyDepartment: { select: { id: true, type: true, customName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const byDepartmentType = new Map<DepartmentType, typeof plays>();
  plays.forEach((p) => {
    const t = p.companyDepartment.type;
    if (!byDepartmentType.has(t)) byDepartmentType.set(t, []);
    byDepartmentType.get(t)!.push(p);
  });

  const needsActionToday = plays.filter((p) => {
    if (!p.nextActionDue) return false;
    const d = new Date(p.nextActionDue);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;
  const totalActiveCount = plays.length + useCasePlays.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard/plays" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Play Library
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Active Plays</h1>
          <p className="text-gray-600">
            You have {totalActiveCount} active play{totalActiveCount !== 1 ? 's' : ''} across{' '}
            {new Set([...plays.map((p) => p.companyId), ...useCasePlays.map((p) => p.companyId)]).size} account{totalActiveCount !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-500">Group by:</span>
          <span className="font-medium text-gray-700">Department</span>
        </div>

        {needsActionToday > 0 && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <strong>{needsActionToday}</strong> play{needsActionToday !== 1 ? 's' : ''} need action TODAY.
          </div>
        )}

        {useCasePlays.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Use Case Exploration ({useCasePlays.length} play{useCasePlays.length !== 1 ? 's' : ''})
            </h2>
            <ul className="space-y-4">
              {useCasePlays.map((play) => {
                const deptName = play.companyDepartment.customName ?? play.companyDepartment.type.replace(/_/g, ' ');
                return (
                  <li key={play.id}>
                    <div className="bg-white rounded-lg border shadow-sm p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Link
                          href={`/dashboard/companies/${play.company.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {play.company.name}
                        </Link>
                        <span className="text-gray-500">→</span>
                        <span className="font-medium text-gray-800">{deptName}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Step {play.currentStep} of 4 · {play.playState.replace(/_/g, ' ')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/plays/use-case-exploration/${play.id}`}>
                            Open Play
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/companies/${play.company.id}/departments/${play.companyDepartment.id}`}>
                            View Department
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="space-y-8">
          {Array.from(byDepartmentType.entries())
            .sort(([a], [b]) => DEPARTMENT_TYPE_GROUP[a].localeCompare(DEPARTMENT_TYPE_GROUP[b]))
            .map(([deptType, departmentPlays]) => {
              const sectionLabel = DEPARTMENT_TYPE_GROUP[deptType];
              const icon = SECTION_ICONS[sectionLabel] ?? '📋';
              return (
                <section key={deptType}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {icon} {sectionLabel.toUpperCase()} DEPARTMENTS ({departmentPlays.length} play{departmentPlays.length !== 1 ? 's' : ''})
                  </h2>
                  <ul className="space-y-4">
                    {departmentPlays.map((play) => {
                      const deptName = play.companyDepartment.customName ?? play.companyDepartment.type.replace(/_/g, ' ');
                      const opportunityStr = play.opportunitySize != null
                        ? `$${Number(play.opportunitySize).toLocaleString()}`
                        : null;
                      return (
                        <li key={play.id}>
                          <div className="bg-white rounded-lg border shadow-sm p-5">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Link
                                href={`/dashboard/companies/${play.company.id}`}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {play.company.name}
                              </Link>
                              <span className="text-gray-500">→</span>
                              <span className="font-medium text-gray-800">{deptName}</span>
                              <span className="text-gray-600">→ {play.product.name}</span>
                              {opportunityStr && (
                                <span className="text-sm text-gray-500">({opportunityStr})</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-3">
                              Week {play.weekNumber} of {play.totalWeeks} | Status: {PLAY_STATUS_LABELS[play.status]}
                            </div>
                            {play.lastActionSummary && (
                              <div className="text-sm text-gray-600 mb-1">
                                Last: {play.lastActionSummary}
                                {play.lastActionAt && (
                                  <span className="text-gray-400 ml-1">
                                    ({formatRelative(play.lastActionAt)})
                                  </span>
                                )}
                              </div>
                            )}
                            {play.nextActionSummary && (
                              <div className="text-sm text-gray-700 mb-4">
                                Next: {play.nextActionSummary}
                                {play.nextActionDue && (
                                  <span className={isToday(play.nextActionDue) ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                                    {isToday(play.nextActionDue) ? ' TODAY' : ` (${new Date(play.nextActionDue).toLocaleDateString()})`}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link
                                  href={`/chat?play=expansion&accountId=${play.companyId}&contactId=`}
                                >
                                  Draft Follow-Up
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/companies/${play.company.id}/departments/${play.companyDepartment.id}`}>
                                  View Play
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
        </div>

        {totalActiveCount === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <p className="mb-4">No active plays yet.</p>
            <p className="text-sm mb-4">
              Start a play from a company department page: click &quot;Start Expansion Play&quot; and choose Department Cross-Sell, New Stakeholder Engagement, or Use Case Exploration.
            </p>
            <Button asChild>
              <Link href="/dashboard/companies">View Companies</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border text-sm text-gray-600">
          <strong>Insights:</strong> Track follow-ups and next actions per play. Use &quot;View Play&quot; to open the department and &quot;Draft Follow-Up&quot; to chat with the expansion agent.
        </div>
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
  const now = new Date();
  const date = new Date(d);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function isToday(d: Date): boolean {
  const a = new Date(d);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
