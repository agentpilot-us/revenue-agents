import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { persistSalesMapPlans, type GeneratedPlan } from '@/lib/roadmap/generate-sales-map-plans';
import { z } from 'zod';

const planSchema = z.object({
  title: z.string(),
  description: z.string(),
  phaseOrder: z.number(),
  phaseName: z.string(),
  weekRange: z.string().nullable(),
  contentType: z.string(),
  targetDivisionName: z.string().optional(),
  targetContactRole: z.string().optional(),
  triggerSignalType: z.string().optional(),
  productFraming: z.string().optional(),
  existingProductReference: z.string().optional(),
  objectionAddressed: z.string().optional(),
});

const bodySchema = z.object({
  templateId: z.string().min(1),
  roadmapId: z.string().min(1),
  plans: z.array(planSchema),
});

/**
 * POST /api/roadmap/targets/[targetId]/generate-plans/confirm
 *
 * Persists the reviewed/edited plans as RoadmapPlan rows.
 * Called after the rep reviews the dry-run preview.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetId } = await params;
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { templateId, roadmapId, plans } = parsed.data;

    // Verify ownership
    const roadmap = await prisma.adaptiveRoadmap.findFirst({
      where: { id: roadmapId, userId: session.user.id },
      select: { id: true },
    });
    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const target = await prisma.roadmapTarget.findFirst({
      where: { id: targetId, roadmapId },
      select: { id: true, companyId: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }
    if (!target.companyId) {
      return NextResponse.json({ error: 'Target has no linked company' }, { status: 400 });
    }

    const result = await persistSalesMapPlans({
      roadmapId,
      targetId,
      templateId,
      companyId: target.companyId,
      plans: plans as GeneratedPlan[],
    });

    return NextResponse.json({ created: result.created });
  } catch (error) {
    console.error('POST /api/roadmap/targets/[targetId]/generate-plans/confirm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to persist plans' },
      { status: 500 }
    );
  }
}
