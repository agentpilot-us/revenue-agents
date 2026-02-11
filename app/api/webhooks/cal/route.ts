import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Cal.com webhook – booking created, cancelled, rescheduled.
 * Optionally verify with CAL_WEBHOOK_SECRET (cal-signature or x-cal-signature header).
 *
 * Payload shape:
 * {
 *   triggerEvent: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED',
 *   createdAt: '2024-01-01T00:00:00.000Z',
 *   payload: {
 *     uid: 'booking_uid',
 *     title: 'Event Title',
 *     startTime: '2024-01-15T10:00:00.000Z',
 *     endTime: '2024-01-15T11:00:00.000Z',
 *     attendees: [{ email: '...', name: '...' }],
 *     metadata: { ... }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('cal-signature') ?? req.headers.get('x-cal-signature') ?? '';
    const secret = process.env.CAL_WEBHOOK_SECRET;
    if (secret && signature) {
      // Optional: verify Cal.com signature when you implement verifySignature
      // if (!verifySignature(body, signature, secret)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      triggerEvent?: string;
      payload?: { uid?: string; title?: string; startTime?: string; [k: string]: unknown };
    };
    const triggerEvent = payload.triggerEvent ?? (payload as { type?: string }).type;
    const booking = payload.payload;

    if (!booking?.uid) {
      console.log('Cal.com webhook missing payload.uid');
      return NextResponse.json({ received: true });
    }

    const bookingUid = booking.uid as string;
    const eventTitle = (booking.title as string) || 'Calendar event';
    const startTime = booking.startTime as string | undefined;

    console.log('Cal.com webhook received:', triggerEvent);

    const activities = await prisma.activity.findMany({
      where: { calEventId: bookingUid },
      include: { contact: true },
    });

    if (activities.length === 0) {
      console.log('No activities found for booking:', bookingUid);
      return NextResponse.json({ received: true });
    }

    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        for (const activity of activities) {
          if (!activity.contactId) continue;

          const displayName = activity.contact
            ? [activity.contact.firstName, activity.contact.lastName].filter(Boolean).join(' ') ||
              activity.contact.email ||
              'Contact'
            : 'Contact';

          await prisma.eventAttendance.upsert({
            where: {
              contactId_eventName: {
                contactId: activity.contactId,
                eventName: eventTitle,
              },
            },
            create: {
              contactId: activity.contactId,
              eventName: eventTitle,
              eventDate: startTime ? new Date(startTime) : new Date(),
              source: 'calendar_invite',
              rsvpStatus: 'accepted',
            },
            update: {
              rsvpStatus: 'accepted',
              eventDate: startTime ? new Date(startTime) : undefined,
            },
          });

          await prisma.contact.update({
            where: { id: activity.contactId },
            data: {
              isResponsive: true,
              lastContactedAt: new Date(),
              lastContactMethod: 'Calendar',
            },
          });

          await prisma.activity.create({
            data: {
              type: 'CalendarAccepted',
              summary: `${displayName} accepted calendar invite`,
              companyId: activity.companyId,
              contactId: activity.contactId,
              userId: activity.userId,
            },
          });
        }
        break;

      case 'BOOKING_CANCELLED':
        for (const activity of activities) {
          if (!activity.contactId) continue;

          const displayName = activity.contact
            ? [activity.contact.firstName, activity.contact.lastName].filter(Boolean).join(' ') ||
              activity.contact.email ||
              'Contact'
            : 'Contact';

          await prisma.eventAttendance.updateMany({
            where: {
              contactId: activity.contactId,
              eventName: eventTitle,
            },
            data: { rsvpStatus: 'declined' },
          });

          await prisma.activity.create({
            data: {
              type: 'CalendarCancelled',
              summary: `${displayName} cancelled calendar invite`,
              companyId: activity.companyId,
              contactId: activity.contactId,
              userId: activity.userId,
            },
          });
        }
        break;

      case 'BOOKING_RESCHEDULED':
        for (const activity of activities) {
          if (!activity.contactId) continue;

          const displayName = activity.contact
            ? [activity.contact.firstName, activity.contact.lastName].filter(Boolean).join(' ') ||
              activity.contact.email ||
              'Contact'
            : 'Contact';
          const newDate = startTime ? new Date(startTime) : new Date();

          await prisma.eventAttendance.updateMany({
            where: {
              contactId: activity.contactId,
              eventName: eventTitle,
            },
            data: { eventDate: newDate },
          });

          await prisma.activity.create({
            data: {
              type: 'CalendarRescheduled',
              summary: `${displayName} rescheduled to ${newDate.toLocaleString()}`,
              companyId: activity.companyId,
              contactId: activity.contactId,
              userId: activity.userId,
            },
          });
        }
        break;

      default:
        console.log('Unhandled webhook type:', triggerEvent);
    }

    return NextResponse.json({ received: true, event: triggerEvent });
  } catch (e) {
    console.error('Cal.com webhook error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
