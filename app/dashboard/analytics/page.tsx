import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PlayStatus, DepartmentType } from '@prisma/client';
import { Button } from '@/components/ui/button';

const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  [DepartmentType.MANUFACTURING_OPERATIONS]: 'Manufacturing Operations',
  [DepartmentType.INDUSTRIAL_DESIGN]: 'Industrial Design',
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
  [DepartmentType.EXECUTIVE_LEADERSHIP]: 'Executive Leadership',
  [DepartmentType.FINANCE]: 'Finance',
  [DepartmentType.LEGAL]: 'Legal',
  [DepartmentType.HR]: 'HR',
  [DepartmentType.OTHER]: 'Other',
};

const SECTION_ICONS: Record<string, string> = {
  'Manufacturing Operations': '🏭',
  'Industrial Design': '🎨',
  'Autonomous Vehicles': '🚗',
  'IT / Data Center': '💻',
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const plays = await prisma.expansionPlay.findMany({
    where: { company: { userId: session.user.id } },
    include: {
      companyDepartment: { select: { type: true } },
      product: { select: { name: true } },
    },
  });

  const byDeptType = new Map<
    DepartmentType,
    {
      launched: number;
      won: number;
      lost: number;
      active: number;
      totalOpportunityWon: number;
      cycleDays: number[];
      productWonTotal: Map<string, number>;
    }
  >();

  for (const play of plays) {
    const type = play.companyDepartment.type;
    if (!byDeptType.has(type)) {
      byDeptType.set(type, {
        launched: 0,
        won: 0,
        lost: 0,
        active: 0,
        totalOpportunityWon: 0,
        cycleDays: [],
        productWonTotal: new Map(),
      });
    }
    const row = byDeptType.get(type)!;
    row.launched += 1;
    if (play.status === PlayStatus.WON) {
      row.won += 1;
      const amt = play.opportunitySize != null ? Number(play.opportunitySize) : 0;
      row.totalOpportunityWon += amt;
      const cycleMs =
        new Date(play.updatedAt).getTime() - new Date(play.createdAt).getTime();
      row.cycleDays.push(cycleMs / (24 * 60 * 60 * 1000));
      const name = play.product.name;
      row.productWonTotal.set(name, (row.productWonTotal.get(name) ?? 0) + amt);
    } else if (play.status === PlayStatus.LOST) {
      row.lost += 1;
    } else {
      row.active += 1;
    }
  }

  const sortedTypes = Array.from(byDeptType.entries())
    .filter(([, r]) => r.launched > 0)
    .sort(([a], [b]) => DEPARTMENT_TYPE_LABELS[a].localeCompare(DEPARTMENT_TYPE_LABELS[b]));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Analytics: Department Performance
        </h1>
        <p className="text-gray-600 mb-6">
          Expansion by department type. Date range: all time.
        </p>

        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-500">Date range: Last 90 days</span>
          <Button variant="outline" size="sm" disabled>
            Filter
          </Button>
          <Button variant="outline" size="sm" disabled>
            Download Report
          </Button>
          <Button variant="outline" size="sm" disabled>
            Share with Team
          </Button>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Expansion by Department Type
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Which departments are easiest to expand into?
          </p>

          <div className="space-y-6">
            {sortedTypes.map(([deptType, r]) => {
              const label = DEPARTMENT_TYPE_LABELS[deptType];
              const icon = SECTION_ICONS[label] ?? '📋';
              const closed = r.won + r.lost;
              const closeRate =
                closed > 0 ? Math.round((r.won / closed) * 100) : 0;
              const avgDeal =
                r.won > 0
                  ? Math.round(r.totalOpportunityWon / r.won)
                  : 0;
              const avgCycleDays =
                r.cycleDays.length > 0
                  ? Math.round(
                      r.cycleDays.reduce((a, b) => a + b, 0) / r.cycleDays.length
                    )
                  : 0;
              const avgCycleMonths =
                avgCycleDays > 0 ? (avgCycleDays / 30).toFixed(1) : '—';
              const topProduct =
                r.productWonTotal.size > 0
                  ? Array.from(r.productWonTotal.entries()).sort(
                      (a, b) => b[1] - a[1]
                    )[0][0]
                  : '—';
              const topProductWon =
                r.productWonTotal.size > 0
                  ? Array.from(r.productWonTotal.entries()).sort(
                      (a, b) => b[1] - a[1]
                    )[0][1]
                  : 0;
              const insight =
                label === 'Industrial Design' && avgCycleDays > 0 && avgCycleDays < 120
                  ? 'Fastest sales cycle!'
                  : label === 'IT / Data Center' && avgCycleDays > 180
                    ? 'Longest cycle, lower close rate'
                    : null;

              return (
                <div
                  key={deptType}
                  className="bg-white rounded-lg border shadow-sm p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {label}
                    </h3>
                  </div>
                  <div className="flex gap-4 mb-2">
                    <div
                      className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"
                      title={`${closeRate}% close rate`}
                    >
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${closeRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 shrink-0">
                      {closeRate}% close rate
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {r.launched} plays launched | {r.won} closed-won | {r.active} active
                    </p>
                    <p>
                      Avg deal size: ${avgDeal.toLocaleString()} | Avg cycle:{' '}
                      {avgCycleMonths} months
                    </p>
                    <p>
                      Top product: {topProduct}
                      {topProductWon > 0 && ` ($${topProductWon.toLocaleString()} won)`}
                    </p>
                    {insight && (
                      <p className="text-amber-700 font-medium">
                        Insight: {insight}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {sortedTypes.length === 0 && (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <p>No expansion plays yet. Start plays from company department pages to see analytics here.</p>
            </div>
          )}
        </section>

        <section className="p-4 bg-gray-50 rounded-lg border text-sm text-gray-600">
          <strong>Key insights:</strong> Use close rate and cycle time to prioritize which department types to focus on. Design departments often close fastest; IT/Data Center deals are larger but longer cycle.
        </section>
      </div>
    </div>
  );
}
