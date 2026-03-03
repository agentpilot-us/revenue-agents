import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string; contactId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId, contactId } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId, company: { userId: session.user.id } },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const now = new Date();
  const attendances = await prisma.eventAttendance.findMany({
    where: { contactId, eventDate: { gte: now } },
    orderBy: { eventDate: 'asc' },
    select: { eventName: true, eventDate: true, rsvpStatus: true },
  });

  return NextResponse.json({
    attendances: attendances.map((a) => ({
      eventName: a.eventName,
      eventDate: a.eventDate.toISOString().split('T')[0],
      rsvpStatus: a.rsvpStatus,
    })),
  });
}
