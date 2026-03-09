import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;

  const [workflows, templateStatsRaw] = await Promise.all([
    prisma.actionWorkflow.findMany({
      where: { companyId, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        outcome: true,
        outcomeNote: true,
        outcomeAt: true,
        completedAt: true,
        templateId: true,
        targetDivision: { select: { id: true, customName: true, type: true } },
        _count: { select: { steps: true } },
        steps: { select: { status: true } },
      },
    }),
    prisma.actionWorkflow.groupBy({
      by: ['templateId', 'outcome'],
      where: { userId: session.user.id, templateId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const mapped = workflows.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    outcome: w.outcome,
    outcomeNote: w.outcomeNote,
    completedAt: w.completedAt?.toISOString() ?? null,
    templateId: w.templateId,
    targetDivision: w.targetDivision,
    _count: w._count,
    completedSteps: w.steps.filter(
      (s) => s.status === 'completed' || s.status === 'sent',
    ).length,
  }));

  // Aggregate template stats: { [templateId]: { total, outcomes: { [outcome]: count } } }
  const templateStats: Record<string, { total: number; outcomes: Record<string, number> }> = {};
  for (const row of templateStatsRaw) {
    if (!row.templateId) continue;
    if (!templateStats[row.templateId]) {
      templateStats[row.templateId] = { total: 0, outcomes: {} };
    }
    templateStats[row.templateId].total += row._count.id;
    if (row.outcome) {
      templateStats[row.templateId].outcomes[row.outcome] =
        (templateStats[row.templateId].outcomes[row.outcome] ?? 0) + row._count.id;
    }
  }

  return NextResponse.json({ workflows: mapped, templateStats });
}
