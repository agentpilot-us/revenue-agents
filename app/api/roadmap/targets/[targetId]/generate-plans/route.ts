import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateSalesMapPlans } from '@/lib/roadmap/generate-sales-map-plans';
import { z } from 'zod';

const bodySchema = z.object({
  templateId: z.string().min(1),
  roadmapId: z.string().min(1),
});

/**
 * POST /api/roadmap/targets/[targetId]/generate-plans
 *
 * Dry-run: generates a plan preview using the LLM + template.
 * Does NOT persist anything. The rep reviews and then calls /confirm.
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

    const { templateId, roadmapId } = parsed.data;

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
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    const preview = await generateSalesMapPlans({
      roadmapId,
      targetId,
      templateId,
      userId: session.user.id,
    });

    return NextResponse.json({ preview });
  } catch (error) {
    console.error('POST /api/roadmap/targets/[targetId]/generate-plans error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate plans' },
      { status: 500 }
    );
  }
}
