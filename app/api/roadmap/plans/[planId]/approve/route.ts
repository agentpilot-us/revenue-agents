import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/roadmap/plans/[planId]/approve
 *
 * Marks a Plan as approved (and optionally executed). In v1 this endpoint
 * focuses on status transitions; deeper automation (auto-execute flows) can
 * be layered on later.
 */

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { planId } = await params;

  const plan = await prisma.roadmapPlan.findFirst({
    where: {
      id: planId,
      roadmap: { userId: session.user.id },
    },
    include: {
      roadmap: true,
      signal: true,
      target: {
        include: {
          company: true,
          companyDepartment: true,
        },
      },
      actionMapping: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // For v1 we simply mark the plan as approved. Future iterations can:
  // - enqueue content generation
  // - create PendingAction records
  // - write Activity logs, etc.
  const updated = await prisma.roadmapPlan.update({
    where: { id: plan.id },
    data: { status: 'approved' },
  });

  return NextResponse.json({ plan: updated });
}

