import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';

/**
 * POST /api/action-workflows/bulk-event-invite
 *
 * Creates ActionWorkflows for multiple contacts at an event.
 * Expects:
 *   - templateId: PlaybookTemplate to use (event-related)
 *   - companyId: Target account
 *   - contactIds: Array of contact IDs to invite
 *   - accountSignalId: Optional signal that triggered this
 *   - eventId: Optional ContentLibrary ID for the specific event
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { templateId, companyId, contactIds, accountSignalId, eventId } = body;

    if (!templateId || !companyId || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'templateId, companyId, and contactIds[] are required' },
        { status: 400 },
      );
    }

    const [contacts, eventRecord] = await Promise.all([
      prisma.contact.findMany({
        where: { id: { in: contactIds }, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyDepartmentId: true,
        },
      }),
      eventId
        ? prisma.contentLibrary.findUnique({
            where: { id: eventId },
            select: { id: true, title: true, content: true },
          })
        : null,
    ]);

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found' },
        { status: 400 },
      );
    }

    const eventContext = eventRecord
      ? {
          eventId: eventRecord.id,
          eventTitle: eventRecord.title,
          ...(eventRecord.content as Record<string, unknown> ?? {}),
        }
      : undefined;

    const workflows = [];

    for (const contact of contacts) {
      try {
        const workflow = await assembleWorkflow({
          userId: session.user.id,
          companyId,
          templateId,
          accountSignalId: accountSignalId || undefined,
          targetContactId: contact.id,
          targetDivisionId: contact.companyDepartmentId || undefined,
          title: eventRecord
            ? `${eventRecord.title}: ${contact.firstName || ''} ${contact.lastName || ''}`.trim()
            : `Event Invite: ${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          eventContext,
        });
        workflows.push(workflow);
      } catch (err) {
        console.error(
          `Failed to create workflow for contact ${contact.id}:`,
          err,
        );
      }
    }

    return NextResponse.json({
      created: workflows.length,
      total: contacts.length,
      workflows: workflows.map((w) => ({ id: w.id, title: w.title })),
    });
  } catch (error) {
    console.error('POST /api/action-workflows/bulk-event-invite error:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk event invites' },
      { status: 500 },
    );
  }
}
