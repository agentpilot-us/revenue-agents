import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET  /api/roadmap/config?companyId=xxx  — fetch the Sales Map for a specific company
 * PUT  /api/roadmap/config               — upsert high-level roadmap properties (type, objective, contentStrategy)
 */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'companyId query param is required' }, { status: 400 });
  }

  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id, companyId },
    include: {
      company: { select: { id: true, name: true } },
      targets: {
        include: {
          company: { select: { id: true, name: true } },
          companyDepartment: {
            select: { id: true, type: true, customName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      signalRules: { orderBy: { createdAt: 'asc' } },
      actionMappings: { orderBy: { createdAt: 'asc' } },
      conditions: { orderBy: { createdAt: 'asc' } },
    },
  });

  return NextResponse.json({ roadmap });
}

type PutBody = {
  companyId?: string;
  roadmapType?: string;
  objective?: Prisma.InputJsonValue;
  contentStrategy?: Prisma.InputJsonValue;
  operationalLimits?: Prisma.InputJsonValue;
};

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const companyId = body.companyId;
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const data: Prisma.AdaptiveRoadmapUpdateInput = {};
  if (typeof body.roadmapType === 'string' && body.roadmapType.trim()) {
    data.roadmapType = body.roadmapType.trim();
  }
  if (body.objective !== undefined) {
    data.objective = body.objective;
  }
  if (body.contentStrategy !== undefined) {
    data.contentStrategy = body.contentStrategy;
  }
  if (body.operationalLimits !== undefined) {
    data.operationalLimits = body.operationalLimits;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No updatable fields provided' },
      { status: 400 }
    );
  }

  const existing = await prisma.adaptiveRoadmap.findUnique({
    where: { userId_companyId: { userId: session.user.id, companyId } },
    select: { id: true },
  });

  const includeBlock = {
    company: { select: { id: true, name: true } },
    targets: {
      include: {
        company: { select: { id: true, name: true } },
        companyDepartment: {
          select: { id: true, type: true, customName: true },
        },
      },
      orderBy: { createdAt: 'asc' } as const,
    },
    signalRules: { orderBy: { createdAt: 'asc' } as const },
    actionMappings: { orderBy: { createdAt: 'asc' } as const },
    conditions: { orderBy: { createdAt: 'asc' } as const },
  };

  const roadmap = existing
    ? await prisma.adaptiveRoadmap.update({
        where: { id: existing.id },
        data,
        include: includeBlock,
      })
    : await prisma.adaptiveRoadmap.create({
        data: {
          userId: session.user.id,
          companyId,
          roadmapType: (typeof data.roadmapType === 'string' ? data.roadmapType : undefined) ?? 'enterprise_expansion',
          objective: data.objective ?? undefined,
          contentStrategy: data.contentStrategy ?? undefined,
        },
        include: includeBlock,
      });

  return NextResponse.json({ roadmap });
}
