import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET  /api/roadmap/config  — fetch current user's Adaptive Roadmap (if any)
 * PUT  /api/roadmap/config  — upsert high-level roadmap properties (type, objective, contentStrategy)
 *
 * NOTE: In v1 this API is intentionally conservative. It does not try to edit
 * nested collections (targets, rules, mappings) – those are managed by
 * conversational flows and internal tools. The UI can still render them
 * read-only from the GET response.
 */

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roadmap = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id },
    include: {
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
  roadmapType?: string;
  objective?: Prisma.InputJsonValue;
  contentStrategy?: Prisma.InputJsonValue;
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

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No updatable fields provided' },
      { status: 400 }
    );
  }

  const existing = await prisma.adaptiveRoadmap.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const roadmap = existing
    ? await prisma.adaptiveRoadmap.update({
        where: { id: existing.id },
        data,
        include: {
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
      })
    : await prisma.adaptiveRoadmap.create({
        data: {
          userId: session.user.id,
          roadmapType: (typeof data.roadmapType === 'string' ? data.roadmapType : undefined) ?? 'enterprise_expansion',
          objective: data.objective ?? undefined,
          contentStrategy: data.contentStrategy ?? undefined,
        },
        include: {
          targets: {
            include: {
              company: { select: { id: true, name: true } },
              companyDepartment: {
                select: { id: true, type: true, customName: true },
              },
            },
          },
          signalRules: true,
          actionMappings: true,
          conditions: true,
        },
      });

  return NextResponse.json({ roadmap });
}

