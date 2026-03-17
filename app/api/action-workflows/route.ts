import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/** GET: Legacy list of ActionWorkflows. Prefer play-runs and My Day for new flows. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const workflows = await prisma.actionWorkflow.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, industry: true } },
        template: { select: { id: true, name: true, triggerType: true } },
        accountSignal: { select: { id: true, title: true, type: true } },
        targetDivision: { select: { id: true, customName: true, type: true } },
        targetContact: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        steps: { orderBy: { stepOrder: 'asc' }, select: { id: true, status: true, stepType: true } },
      },
      orderBy: [{ urgencyScore: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('GET /api/action-workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 },
    );
  }
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'ActionWorkflow creation is deprecated. Use POST /api/play-runs with playTemplateId instead.',
      migration: 'PlayRun',
    },
    { status: 410 },
  );
}
