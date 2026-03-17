import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type DivisionCoverage = {
  departmentId: string;
  name: string;
  type: string;
  stage: string | null;
  estimatedOpportunity: string | null;
  contacts: number;
  activePlays: number;
  lastTouchDaysAgo: number | null;
  thirtyDayActivity: { emailsSent: number; meetings: number; replies: number };
  health: 'strong' | 'warming' | 'cold' | 'untouched';
};

function computeHealth(
  contacts: number,
  totalActivities: number,
  lastTouchDaysAgo: number | null,
  thirtyDayTotal: number,
): DivisionCoverage['health'] {
  if (contacts === 0 || totalActivities === 0) return 'untouched';
  if (lastTouchDaysAgo === null) return 'untouched';
  if (lastTouchDaysAgo > 14) return 'cold';
  if (lastTouchDaysAgo <= 3 && thirtyDayTotal >= 3) return 'strong';
  return 'warming';
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { userId: session.user.id, companyId },
      select: {
        targets: {
          where: { targetType: 'division' },
          select: {
            stage: true,
            companyDepartment: {
              select: {
                id: true,
                type: true,
                customName: true,
                estimatedOpportunity: true,
                _count: { select: { contacts: true } },
              },
            },
          },
        },
      },
    });

    if (!roadmap) {
      return NextResponse.json({ divisions: [] });
    }

    const deptIds = roadmap.targets
      .map((t) => t.companyDepartment?.id)
      .filter((id): id is string => !!id);

    if (deptIds.length === 0) {
      return NextResponse.json({ divisions: [] });
    }

    const [activeRunCount, activities, allActivities] = await Promise.all([
      prisma.playRun.count({
        where: {
          userId: session.user.id,
          companyId,
          status: 'ACTIVE',
        },
      }),

      prisma.activity.findMany({
        where: {
          userId: session.user.id,
          companyId,
          companyDepartmentId: { in: deptIds },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          companyDepartmentId: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.activity.groupBy({
        by: ['companyDepartmentId'],
        where: {
          companyId,
          companyDepartmentId: { in: deptIds },
        },
        _count: { id: true },
      }),
    ]);

    // PlayRun is company-scoped; no per-division breakdown. Use total active runs for display.
    const activeByDept = new Map<string, number>();
    if (activeRunCount > 0 && deptIds.length > 0) {
      activeByDept.set(deptIds[0], activeRunCount);
    }

    const allActivityByDept = new Map(
      allActivities.map((a) => [a.companyDepartmentId, a._count.id]),
    );

    const now = Date.now();
    const divisions: DivisionCoverage[] = roadmap.targets
      .filter((t) => t.companyDepartment != null)
      .map((t) => {
        const dept = t.companyDepartment!;
        const deptActivities = activities.filter(
          (a) => a.companyDepartmentId === dept.id,
        );

        const latestActivity = deptActivities.length > 0 ? deptActivities[0].createdAt : null;
        const lastTouchDaysAgo = latestActivity
          ? Math.floor((now - latestActivity.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let emailsSent = 0;
        let meetings = 0;
        let replies = 0;
        for (const a of deptActivities) {
          const ty = a.type;
          if (ty === 'EMAIL_SENT' || ty === 'Email') emailsSent++;
          else if (ty === 'MEETING_SCHEDULED' || ty === 'Meeting') meetings++;
          else if (ty === 'REPLY' || ty === 'Reply') replies++;
        }

        const thirtyDayTotal = emailsSent + meetings + replies;
        const totalAllTime = allActivityByDept.get(dept.id) ?? 0;

        return {
          departmentId: dept.id,
          name: dept.customName || dept.type.replace(/_/g, ' '),
          type: dept.type,
          stage: t.stage,
          estimatedOpportunity: dept.estimatedOpportunity,
          contacts: dept._count.contacts,
          activePlays: activeByDept.get(dept.id) ?? 0,
          lastTouchDaysAgo,
          thirtyDayActivity: { emailsSent, meetings, replies },
          health: computeHealth(dept._count.contacts, totalAllTime, lastTouchDaysAgo, thirtyDayTotal),
        };
      });

    return NextResponse.json({ divisions });
  } catch (error) {
    console.error('GET /api/roadmap/coverage error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coverage data' },
      { status: 500 },
    );
  }
}
