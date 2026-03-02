import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventName } = await params;

    const attendance = await prisma.eventAttendance.findFirst({
      where: {
        eventName,
        contact: {
          company: {
            userId: session.user.id,
          },
        },
      },
      select: {
        eventName: true,
        eventDate: true,
        source: true,
        contact: {
          select: {
            companyId: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    if (!attendance || !attendance.contact.companyId) {
      return NextResponse.json(
        { error: 'Event not found for this user' },
        { status: 404 }
      );
    }

    const title = `Activate event: ${attendance.eventName}`;
    const summary = `Track event "${attendance.eventName}" for account ${
      attendance.contact.company?.name ?? ''
    } as a trigger for campaigns and content. Source: ${
      attendance.source
    }. Date: ${attendance.eventDate.toISOString()}.`;

    const signal = await prisma.accountSignal.create({
      data: {
        companyId: attendance.contact.companyId,
        userId: session.user.id,
        type: 'internal_event_trigger',
        title,
        summary,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 6,
        suggestedPlay: 'event_invite',
      },
    });

    return NextResponse.json({ ok: true, signalId: signal.id });
  } catch (error) {
    console.error(
      'POST /api/my-company/events/[eventName]/activate error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to activate event trigger' },
      { status: 500 }
    );
  }
}

