import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { syncPlayActionsForTemplateRole } from '@/lib/plays/play-run-roster';

/**
 * PATCH /api/play-runs/[runId]/roster
 * Body: { playTemplateRoleId, contactId } — contactId null clears slot.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await params;
    const body = await req.json();
    const { playTemplateRoleId, contactId: rawContactId } = body as {
      playTemplateRoleId?: string;
      contactId?: string | null;
    };

    if (!playTemplateRoleId || typeof playTemplateRoleId !== 'string') {
      return NextResponse.json({ error: 'playTemplateRoleId is required' }, { status: 400 });
    }

    const run = await prisma.playRun.findFirst({
      where: { id: runId, userId: session.user.id },
      select: { id: true, companyId: true, playTemplateId: true },
    });
    if (!run) {
      return NextResponse.json({ error: 'Play run not found' }, { status: 404 });
    }

    const role = await prisma.playTemplateRole.findFirst({
      where: { id: playTemplateRoleId, playTemplateId: run.playTemplateId },
      select: { id: true },
    });
    if (!role) {
      return NextResponse.json({ error: 'Role not on this play template' }, { status: 400 });
    }

    const nextId =
      rawContactId === undefined || rawContactId === null || rawContactId === '' ?
        null
      : rawContactId;

    if (nextId) {
      const c = await prisma.contact.findFirst({
        where: { id: nextId, companyId: run.companyId },
        select: { id: true },
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
          playRunId: run.id,
          playTemplateRoleId: role.id,
        },
      },
      data: {
        contactId: nextId,
        status: nextId ? 'CONFIRMED' : 'UNASSIGNED',
        autoFilledAt: null,
      },
    });

    await syncPlayActionsForTemplateRole(run.id, role.id, { clearGenerated: true });

    const roster = await prisma.playRunContact.findMany({
      where: { playRunId: run.id },
      include: {
        playTemplateRole: {
          select: {
            id: true,
            key: true,
            label: true,
            isRequired: true,
            apolloTitleTerms: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            enrichmentStatus: true,
          },
        },
      },
      orderBy: { playTemplateRole: { orderIndex: 'asc' } },
    });

    return NextResponse.json({ ok: true, roster });
  } catch (error) {
    console.error('PATCH /api/play-runs/[runId]/roster error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update roster' },
      { status: 500 },
    );
  }
}
