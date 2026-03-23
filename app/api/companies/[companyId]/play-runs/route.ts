/**
 * GET /api/companies/[companyId]/play-runs
 * List PlayRuns for the company. Optional ?status=ACTIVE,PROPOSED,PAUSED to filter.
 * Returns progress (completedActions, totalActions) when requested for SAP/read-only views.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { PlayRunStatus } from '@prisma/client';

const IN_PROGRESS_STATUSES: PlayRunStatus[] = ['ACTIVE', 'PROPOSED', 'PAUSED'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const statusParam = req.nextUrl.searchParams.get('status');
    const withProgress = req.nextUrl.searchParams.get('progress') === '1';

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const statusFilter: { in: PlayRunStatus[] } | undefined =
      statusParam === 'in_progress'
        ? { in: IN_PROGRESS_STATUSES }
        : statusParam
          ? { in: statusParam.split(',').map((s) => s.trim()).filter(Boolean) as PlayRunStatus[] }
          : undefined;

    const where = {
      companyId,
      userId: session.user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const runs = await prisma.playRun.findMany({
      where,
      orderBy: { activatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        activatedAt: true,
        playTemplate: { select: { id: true, name: true, slug: true } },
        _count: { select: { phaseRuns: true } },
        ...(withProgress
          ? {
              phaseRuns: {
                select: {
                  actions: { select: { id: true, status: true } },
                },
              },
            }
          : {}),
      },
    });

    const list = runs.map((r) => {
      const run = r as typeof r & { phaseRuns?: Array<{ actions: Array<{ id: string; status: string }> }> };
      let completedActions = 0;
      let totalActions = 0;
      if (run.phaseRuns) {
        for (const pr of run.phaseRuns) {
          for (const a of pr.actions) {
            totalActions += 1;
            if (a.status === 'EXECUTED' || a.status === 'SKIPPED') completedActions += 1;
          }
        }
      }
      return {
        id: run.id,
        title: run.playTemplate.name,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
        activatedAt: run.activatedAt.toISOString(),
        templateId: run.playTemplate.id,
        templateName: run.playTemplate.name,
        playTemplate: run.playTemplate,
        phaseCount: run._count.phaseRuns,
        ...(withProgress ? { completedActions, totalActions } : {}),
      };
    });

    return NextResponse.json({ playRuns: list });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/play-runs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play runs' },
      { status: 500 },
    );
  }
}
