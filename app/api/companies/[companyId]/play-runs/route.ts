/**
 * GET /api/companies/[companyId]/play-runs
 * List PlayRuns for the company (for AccountPlaysTab).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const runs = await prisma.playRun.findMany({
      where: { companyId, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        playTemplate: { select: { id: true, name: true, slug: true } },
        _count: { select: { phaseRuns: true } },
      },
    });

    const list = runs.map((r) => ({
      id: r.id,
      title: r.playTemplate.name,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      templateId: r.playTemplate.id,
      templateName: r.playTemplate.name,
      playTemplate: r.playTemplate,
      phaseCount: r._count.phaseRuns,
    }));

    return NextResponse.json({ playRuns: list });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/play-runs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play runs' },
      { status: 500 },
    );
  }
}
