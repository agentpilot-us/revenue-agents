import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { syncPlayActionsForTemplateRole } from '@/lib/plays/play-run-roster';

/**
 * PATCH /api/play-runs/[runId]/actions/[actionId]
 * Update a PlayAction (e.g. skip, or set edited content).
 * Body: { status?, skipReason?, editedContent?, editedSubject?, contactId? }
 * When contactId changes (including to null), clears generated/edited content so the next Generate uses the new contact.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; actionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, actionId } = await params;
    const body = await req.json();

    const link = await prisma.playAction.findFirst({
      where: { id: actionId },
      select: {
        id: true,
        contactId: true,
        contentTemplateId: true,
        contentTemplate: { select: { name: true } },
        playTemplateRoleId: true,
        phaseRun: {
          select: {
            playRunId: true,
            playRun: { select: { userId: true, companyId: true } },
          },
        },
      },
    });
    if (
      !link ||
      link.phaseRun.playRunId !== runId ||
      link.phaseRun.playRun.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const companyId = link.phaseRun.playRun.companyId;

    const data: Record<string, unknown> = {};
    let clearedForContactChange = false;
    let rosterSynced = false;

    if (body.contactId !== undefined) {
      const raw = body.contactId;
      if (raw !== null && typeof raw !== 'string') {
        return NextResponse.json(
          { error: 'contactId must be a string or null' },
          { status: 400 },
        );
      }
      const prevId = link.contactId ?? null;
      const nextId = raw === null || raw === '' ? null : raw;

      if (nextId !== prevId) {
        clearedForContactChange = true;
        if (link.playTemplateRoleId) {
          if (nextId) {
            const c = await prisma.contact.findFirst({
              where: { id: nextId, companyId },
              select: { firstName: true, lastName: true, email: true, title: true },
            });
            if (!c) {
              return NextResponse.json(
                { error: 'Contact not found on this account' },
                { status: 400 },
              );
            }
          }
          await prisma.playRunContact.update({
            where: {
              playRunId_playTemplateRoleId: {
                playRunId: runId,
                playTemplateRoleId: link.playTemplateRoleId,
              },
            },
            data: {
              contactId: nextId,
              status: nextId ? 'CONFIRMED' : 'UNASSIGNED',
            },
          });
          await syncPlayActionsForTemplateRole(runId, link.playTemplateRoleId, {
            clearGenerated: true,
          });
          rosterSynced = true;
        } else if (nextId) {
          const c = await prisma.contact.findFirst({
            where: { id: nextId, companyId },
            select: { firstName: true, lastName: true, email: true, title: true },
          });
          if (!c) {
            return NextResponse.json(
              { error: 'Contact not found on this account' },
              { status: 400 },
            );
          }
          const displayName = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
          const templateName = link.contentTemplate?.name;
          data.contactId = nextId;
          data.contactName = displayName;
          data.contactEmail = c.email ?? null;
          data.contactTitle = c.title ?? null;
          data.title = templateName ? `${templateName} — ${displayName}` : displayName;
        } else {
          const templateName = link.contentTemplate?.name;
          data.contactId = null;
          data.contactName = null;
          data.contactEmail = null;
          data.contactTitle = null;
          if (templateName) data.title = templateName;
        }
        if (!rosterSynced) {
          data.generatedContent = null;
          data.generatedSubject = null;
          data.generatedAt = null;
          data.modelUsed = null;
          data.tokensUsed = null;
          data.editedContent = null;
          data.editedSubject = null;
          data.reviewedAt = null;
          data.contextSnapshot = null;
        }
      }
    }

    if (body.status === 'SKIPPED') {
      data.status = 'SKIPPED';
      data.skippedAt = new Date();
      data.skipReason = body.skipReason ?? null;
    }
    if (!clearedForContactChange) {
      let touchReview = false;
      if (body.editedContent !== undefined) {
        data.editedContent = body.editedContent ?? null;
        touchReview = true;
      }
      if (body.editedSubject !== undefined) {
        data.editedSubject = body.editedSubject ?? null;
        touchReview = true;
      }
      if (touchReview) data.reviewedAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      const action = await prisma.playAction.findUnique({ where: { id: actionId } });
      return NextResponse.json({ action });
    }

    const action = await prisma.playAction.update({
      where: { id: actionId },
      data: data as Parameters<typeof prisma.playAction.update>[0]['data'],
    });

    if (
      link.contentTemplateId &&
      !clearedForContactChange &&
      (data.editedContent !== undefined || data.editedSubject !== undefined)
    ) {
      await prisma.contentTemplate
        .update({
          where: { id: link.contentTemplateId },
          data: { timesEdited: { increment: 1 } },
        })
        .catch(() => {});
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('PATCH /api/play-runs/[runId]/actions/[actionId] error:', error);
    return NextResponse.json(
      { error: 'Failed to update action' },
      { status: 500 },
    );
  }
}
