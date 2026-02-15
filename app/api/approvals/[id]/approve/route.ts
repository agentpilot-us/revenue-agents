import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendEmail as resendSendEmail } from '@/lib/tools/resend';
import { createCalendarEvent } from '@/lib/tools/cal';
import { addExpansionScore } from '@/lib/gamification/expansion-score';
import { updateUserStreak } from '@/lib/gamification/streaks';
import { advanceEnrollment } from '@/lib/sequences/get-next-touch-context';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pending = await prisma.pendingAction.findFirst({
      where: { id, userId: session.user.id },
      include: { company: true, contact: true },
    });
    if (!pending) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (pending.status !== 'pending') {
      return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
    }

    const payload = pending.payload as Record<string, unknown>;

    if (pending.type === 'email') {
      const to = (payload.to as string) ?? pending.contact?.email;
      const subject = payload.subject as string;
      const body = payload.body as string;
      if (!to || !subject) {
        return NextResponse.json({ error: 'Missing to or subject in payload' }, { status: 400 });
      }
      const result = await resendSendEmail({
        to,
        subject,
        html: body ?? '',
        text: body ?? '',
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      const contactId = (payload.contactId as string) ?? pending.contactId;
      if (result.id && (contactId || to)) {
        try {
          let resolvedContactId = contactId;
          if (!resolvedContactId && to && pending.companyId) {
            const existing = await prisma.contact.findFirst({
              where: { email: to, companyId: pending.companyId },
            });
            if (existing) resolvedContactId = existing.id;
          }
          if (resolvedContactId) {
            const activity = await prisma.activity.create({
              data: {
                type: 'Email',
                summary: `Sent email: ${subject}`,
                content: body,
                companyId: pending.companyId,
                contactId: resolvedContactId,
                userId: session.user.id,
                resendEmailId: result.id,
                agentUsed: 'expansion',
              },
            });
            await prisma.contact.update({
              where: { id: resolvedContactId },
              data: {
                lastEmailSentAt: new Date(),
                totalEmailsSent: { increment: 1 },
              },
            });
            const enrollmentId = payload.enrollmentId as string | undefined;
            const stepIndex = typeof payload.stepIndex === 'number' ? payload.stepIndex : 0;
            if (enrollmentId && activity.id) {
              try {
                await prisma.sequenceTouch.create({
                  data: {
                    enrollmentId,
                    stepIndex,
                    channel: 'email',
                    sentAt: new Date(),
                    activityId: activity.id,
                  },
                });
                await advanceEnrollment(enrollmentId);
              } catch (e) {
                console.error('SequenceTouch/advance after approve email:', e);
              }
            }
            void addExpansionScore(prisma, session.user.id, 'email_sent').catch(() => {});
            void updateUserStreak(prisma, session.user.id).catch(() => {});
          }
        } catch (e) {
          console.error('Failed to create activity for approved email:', e);
        }
      }
    } else if (pending.type === 'calendar_invite') {
      const title = payload.title as string;
      const start = payload.start as string;
      const end = payload.end as string;
      const attendeeEmail = payload.attendeeEmail as string;
      if (!title || !start || !end || !attendeeEmail) {
        return NextResponse.json({ error: 'Missing required calendar fields' }, { status: 400 });
      }
      const res = await createCalendarEvent({ title, start, end, attendeeEmail });
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 502 });
      }
      if (pending.contactId) {
        try {
          const activity = await prisma.activity.create({
            data: {
              type: 'Meeting',
              summary: `Meeting scheduled: ${title}`,
              content: res.data?.link ?? '',
              companyId: pending.companyId,
              contactId: pending.contactId,
              userId: session.user.id,
              calEventId: (res.data as { id?: string })?.id,
              agentUsed: 'expansion',
            },
          });
          const enrollmentId = payload.enrollmentId as string | undefined;
          const stepIndex = typeof payload.stepIndex === 'number' ? payload.stepIndex : 0;
          if (enrollmentId && activity.id) {
            try {
              await prisma.sequenceTouch.create({
                data: {
                  enrollmentId,
                  stepIndex,
                  channel: 'call_task',
                  sentAt: new Date(),
                  activityId: activity.id,
                },
              });
              await advanceEnrollment(enrollmentId);
            } catch (e) {
              console.error('SequenceTouch/advance after approve calendar:', e);
            }
          }
          void addExpansionScore(prisma, session.user.id, 'meeting_booked').catch(() => {});
          void updateUserStreak(prisma, session.user.id).catch(() => {});
        } catch (e) {
          console.error('Failed to create activity for approved calendar:', e);
        }
      }
    } else if (pending.type === 'email_to_segment') {
      const subject = payload.subject as string;
      const body = payload.body as string;
      const contactIds = (payload.contactIds as string[]) ?? [];
      if (!subject || !Array.isArray(contactIds) || contactIds.length === 0) {
        return NextResponse.json({ error: 'Missing subject, body, or contactIds in payload' }, { status: 400 });
      }
      let sent = 0;
      for (const contactId of contactIds) {
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, companyId: pending.companyId },
          select: { id: true, email: true },
        });
        if (!contact?.email) continue;
        const result = await resendSendEmail({
          to: contact.email,
          subject,
          html: body ?? '',
          text: body ?? '',
        });
        if (!result.ok) {
          console.error(`Resend failed for contact ${contactId}:`, result.error);
          continue;
        }
        try {
          await prisma.activity.create({
            data: {
              type: 'Email',
              summary: `Sent email: ${subject}`,
              content: body,
              companyId: pending.companyId,
              contactId: contact.id,
              userId: session.user.id,
              resendEmailId: result.id,
              agentUsed: 'expansion',
            },
          });
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              lastEmailSentAt: new Date(),
              totalEmailsSent: { increment: 1 },
            },
          });
          sent++;
          void addExpansionScore(prisma, session.user.id, 'email_sent').catch(() => {});
          void updateUserStreak(prisma, session.user.id).catch(() => {});
        } catch (e) {
          console.error('Failed to create activity for segment email:', e);
        }
      }
      if (sent === 0) {
        return NextResponse.json({ error: 'No emails could be sent (no valid contact emails)' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: `Execution not implemented for type: ${pending.type}` }, { status: 501 });
    }

    await prisma.pendingAction.update({
      where: { id },
      data: {
        status: 'approved',
        resolvedAt: new Date(),
        resolvedByUserId: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('POST /api/approvals/[id]/approve', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
