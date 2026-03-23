import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { dash } from '@/app/dashboard/dashboard-classes';
import { AnalyticsDashboard } from '@/app/components/analytics/AnalyticsDashboard';

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const primaryRoadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id },
    select: { objective: true, companyId: true, company: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  const objective = primaryRoadmap?.objective as { goalText?: string } | null;
  const goalText = objective?.goalText ?? null;

  return (
    <div className={dash.shell}>
      <div className={dash.gridContainer}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Engagement intelligence across all accounts
          </p>
        </div>
        {goalText && (
          <div className={`${dash.objectiveBar} mb-6`}>
            <div className={dash.objectiveBarInner}>
              <div className={dash.objectiveBarIcon}>🎯</div>
              <div>
                <div className={dash.objectiveBarLabel}>Roadmap objective</div>
                <div className={dash.objectiveBarGoal}>{goalText}</div>
              </div>
            </div>
          </div>
        )}
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
