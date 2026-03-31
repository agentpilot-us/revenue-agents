import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

/**
 * POST /api/play-runs/batch
 * Body: { playTemplateId, items: [{ companyId, roadmapTargetId?, targetCompanyDepartmentId?, targetContactId? }] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { playTemplateId, items } = body as {
      playTemplateId?: string;
      items?: Array<{
        companyId: string;
        roadmapTargetId?: string | null;
        targetCompanyDepartmentId?: string | null;
        targetContactId?: string | null;
        anchorDate?: string | null;
      }>;
    };

    if (!playTemplateId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'playTemplateId and non-empty items[] are required' },
        { status: 400 },
      );
    }

    const { prisma } = await import('@/lib/db');
    const results: Array<{ companyId: string; ok: boolean; playRunId?: string; error?: string }> =
      [];

    for (const item of items) {
      if (!item.companyId) {
        results.push({ companyId: item.companyId ?? '', ok: false, error: 'missing companyId' });
        continue;
      }
      try {
        let targetContact: { name: string; email?: string | null; title?: string | null } | null =
          null;
        let resolvedTargetContactId: string | null = null;
        if (item.targetContactId) {
          const contact = await prisma.contact.findFirst({
            where: { id: item.targetContactId, companyId: item.companyId },
            select: { id: true, firstName: true, lastName: true, email: true, title: true },
          });
          if (contact) {
            resolvedTargetContactId = contact.id;
            targetContact = {
              name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
              email: contact.email,
              title: contact.title,
            };
          }
        }

        const anchorDate = item.anchorDate ? new Date(item.anchorDate) : undefined;
        const playRun = await createPlayRunFromTemplate({
          userId: session.user.id,
          companyId: item.companyId,
          playTemplateId,
          anchorDate: anchorDate ?? null,
          targetContact,
          targetContactId: resolvedTargetContactId,
          roadmapTargetId: item.roadmapTargetId ?? null,
          targetCompanyDepartmentId: item.targetCompanyDepartmentId ?? null,
        });
        results.push({ companyId: item.companyId, ok: true, playRunId: playRun.id });
      } catch (e) {
        results.push({
          companyId: item.companyId,
          ok: false,
          error: e instanceof Error ? e.message : 'create failed',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('POST /api/play-runs/batch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch create failed' },
      { status: 500 },
    );
  }
}
