import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bodySchema = z.object({
  status: z.enum(['pending', 'approved', 'dismissed', 'executed']),
});

/**
 * PATCH /api/roadmap/plans/[planId]/status
 * Update the status of a RoadmapPlan.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { planId } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const plan = await prisma.roadmapPlan.findFirst({
    where: { id: planId },
    include: { roadmap: { select: { userId: true } } },
  });

  if (!plan || plan.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const updated = await prisma.roadmapPlan.update({
    where: { id: planId },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === 'dismissed' ? { dismissReason: 'User dismissed from Sales Map' } : {}),
    },
  });

  return NextResponse.json(updated);
}
