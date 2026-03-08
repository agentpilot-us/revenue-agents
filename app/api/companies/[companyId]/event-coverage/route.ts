import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const totalContacts = await prisma.contact.count({ where: { companyId } });

    const attendances = await prisma.eventAttendance.findMany({
      where: {
        contact: { companyId },
      },
      select: {
        eventName: true,
        eventDate: true,
        rsvpStatus: true,
      },
    });

    const eventMap = new Map<
      string,
      { eventDate: Date; registered: number; invited: number; attended: number }
    >();

    for (const a of attendances) {
      let entry = eventMap.get(a.eventName);
      if (!entry) {
        entry = { eventDate: a.eventDate, registered: 0, invited: 0, attended: 0 };
        eventMap.set(a.eventName, entry);
      }
      const status = (a.rsvpStatus ?? '').toLowerCase();
      if (status === 'attended') entry.attended++;
      else if (status === 'registered') entry.registered++;
      else if (status === 'invited') entry.invited++;
    }

    const events = [...eventMap.entries()]
      .sort((a, b) => a[1].eventDate.getTime() - b[1].eventDate.getTime())
      .map(([eventName, data]) => ({
        eventName,
        eventDate: data.eventDate.toISOString(),
        registered: data.registered,
        invited: data.invited,
        attended: data.attended,
        totalContacts,
      }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/event-coverage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
