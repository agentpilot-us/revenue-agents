import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type DismissBody = {
  reason?: string;
};

/**
 * POST /api/roadmap/plans/[planId]/dismiss
 *
 * Marks a Plan as dismissed and records an optional reason. This feeds the
 * future feedback loop for tuning signal→Plan rules.
 */

export async function POST(
  req: NextRequest,
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
    select: { id: true },
  });

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  let body: DismissBody = {};
  try {
    if (req.body) {
      body = (await req.json()) as DismissBody;
    }
  } catch {
    // If body is not JSON, ignore and proceed with null reason.
  }

  const updated = await prisma.roadmapPlan.update({
    where: { id: plan.id },
    data: {
      status: 'dismissed',
      dismissReason: body.reason?.slice(0, 2000) ?? null,
    },
  });

  return NextResponse.json({ plan: updated });
}

