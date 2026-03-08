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

  const workflows = await prisma.actionWorkflow.findMany({
    where: { companyId, userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
      _count: { select: { steps: true } },
      steps: { select: { status: true } },
    },
  });

  const mapped = workflows.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    _count: w._count,
    completedSteps: w.steps.filter(
      (s) => s.status === 'completed' || s.status === 'sent',
    ).length,
  }));

  return NextResponse.json({ workflows: mapped });
}
