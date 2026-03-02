import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Derive "Company events" from EventAttendance tied to this user's accounts.
  const attendances = await prisma.eventAttendance.findMany({
    where: {
      contact: {
        company: {
          userId,
        },
      },
    },
    select: {
      eventName: true,
      eventDate: true,
      source: true,
    },
    orderBy: {
      eventDate: 'desc',
    },
  });

  const byKey = new Map<
    string,
    { name: string; date: string; sources: Set<string>; count: number }
  >();

  for (const a of attendances) {
    const dateKey = a.eventDate.toISOString().split('T')[0];
    const key = `${a.eventName}::${dateKey}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      existing.sources.add(a.source);
    } else {
      byKey.set(key, {
        name: a.eventName,
        date: dateKey,
        sources: new Set([a.source]),
        count: 1,
      });
    }
  }

  const events = Array.from(byKey.values()).map((e) => ({
    name: e.name,
    date: e.date,
    count: e.count,
    sources: Array.from(e.sources),
  }));

  return NextResponse.json({ events });
}

