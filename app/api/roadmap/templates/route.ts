import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/roadmap/templates
 * Returns built-in templates and user-specific custom templates.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const templates = await prisma.salesMapTemplate.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { isBuiltIn: true, userId: null },
      ],
    },
    include: {
      phases: {
        orderBy: { phaseOrder: 'asc' },
        select: {
          id: true,
          phaseOrder: true,
          name: true,
          description: true,
          weekRange: true,
          suggestedPlanTypes: true,
          defaultContentTypes: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ templates });
}
