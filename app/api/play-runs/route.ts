import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

/**
 * POST /api/play-runs
 * Create a PlayRun from a PlayTemplate (new play system).
 * Body: { companyId, playTemplateId, anchorDate?, targetContactId?, accountSignalId?, title? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyId,
      playTemplateId,
      anchorDate: anchorDateStr,
      targetContactId,
      accountSignalId,
      title,
      roadmapTargetId,
      productId,
      triggerType,
      triggerContext,
    } = body;

    if (!companyId || !playTemplateId) {
      return NextResponse.json(
        { error: 'companyId and playTemplateId are required' },
        { status: 400 },
      );
    }

    const { prisma } = await import('@/lib/db');
    const anchorDate = anchorDateStr ? new Date(anchorDateStr) : undefined;

    let targetContact: { name: string; email?: string | null; title?: string | null } | null =
      null;
    if (targetContactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: targetContactId },
        select: { firstName: true, lastName: true, email: true, title: true },
      });
      if (contact) {
        targetContact = {
          name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
          email: contact.email,
          title: contact.title,
        };
      }
    }

    const playRun = await createPlayRunFromTemplate({
      userId: session.user.id,
      companyId,
      playTemplateId,
      anchorDate: anchorDate ?? null,
      targetContact,
      accountSignalId: accountSignalId ?? null,
      title: title ?? null,
      roadmapTargetId: roadmapTargetId ?? null,
      productId: productId ?? null,
      triggerType: triggerType ?? undefined,
      triggerContext: triggerContext ?? null,
    });

    return NextResponse.json({ playRunId: playRun.id, playRun });
  } catch (error) {
    console.error('POST /api/play-runs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create play run' },
      { status: 500 },
    );
  }
}
