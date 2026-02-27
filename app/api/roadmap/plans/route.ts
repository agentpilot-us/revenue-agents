import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/roadmap/plans?status=pending
 *
 * Returns roadmap Plans for the current AE, scoped by optional status.
 * This is the primary data source for the dashboard's Plans section.
 */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';

  const plans = await prisma.roadmapPlan.findMany({
    where: {
      status,
      roadmap: { userId: session.user.id },
    },
    include: {
      roadmap: {
        select: { id: true, roadmapType: true },
      },
      signal: {
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          publishedAt: true,
          relevanceScore: true,
        },
      },
      target: {
        include: {
          company: { select: { id: true, name: true } },
          companyDepartment: {
            select: { id: true, type: true, customName: true },
          },
        },
      },
      signalRule: {
        select: { id: true, name: true, category: true },
      },
      actionMapping: {
        select: { id: true, actionType: true, autonomyLevel: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  });

  const items = plans.map((p) => ({
    id: p.id,
    status: p.status,
    autonomyLevel: p.autonomyLevel,
    roadmapType: p.roadmap.roadmapType,
    signal: p.signal && {
      id: p.signal.id,
      type: p.signal.type,
      title: p.signal.title,
      summary: p.signal.summary,
      publishedAt: p.signal.publishedAt,
      relevanceScore: p.signal.relevanceScore,
    },
    target: p.target && {
      id: p.target.id,
      name:
        p.target.companyDepartment?.customName ??
        p.target.companyDepartment?.type?.replace(/_/g, ' ') ??
        p.target.company?.name ??
        p.target.name,
      targetType: p.target.targetType,
      companyName: p.target.company?.name ?? null,
    },
    rule: p.signalRule && {
      id: p.signalRule.id,
      name: p.signalRule.name,
      category: p.signalRule.category,
    },
    action: p.actionMapping && {
      id: p.actionMapping.id,
      actionType: p.actionMapping.actionType,
      autonomyLevel: p.actionMapping.autonomyLevel,
    },
    previewPayload: p.previewPayload,
    matchInfo: p.matchInfo,
    createdAt: p.createdAt,
  }));

  return NextResponse.json({ plans: items });
}

