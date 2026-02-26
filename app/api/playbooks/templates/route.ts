/**
 * GET /api/playbooks/templates
 * List playbook templates for the current user (including built-in).
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const templates = await prisma.playbookTemplate.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { steps: true } } },
    orderBy: [{ isDefault: 'desc' }, { isBuiltIn: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      triggerType: t.triggerType ?? (t.name.toLowerCase().includes('renewal')
        ? 'renewal'
        : t.name.toLowerCase().includes('event')
          ? 'event'
          : t.name.toLowerCase().includes('logo')
            ? 'new_logo'
            : 'manual'),
      isDefault: t.isDefault ?? t.isBuiltIn,
      stepCount: t._count.steps,
      steps: [], // client can refetch with steps if needed; timeline modal uses stepCount
    })),
  });
}
