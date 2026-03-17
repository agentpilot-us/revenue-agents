import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

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
    const userId = session.user.id;

    const attendance = await prisma.eventAttendance.findFirst({
      where: {
        eventName,
        contact: {
          company: { userId },
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
      return NextResponse.json({ error: 'Event not found for this user' }, { status: 404 });
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
        userId,
        type: 'internal_event_trigger',
        title,
        summary,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 6,
        suggestedPlay: 'event_invite',
      },
    });

    const playRunIds = await autoCreateEventPlayRuns(userId, eventName);

    return NextResponse.json({ ok: true, signalId: signal.id, playRunsCreated: playRunIds.length });
  } catch (error) {
    console.error('POST /api/my-company/events/[eventName]/activate error:', error);
    return NextResponse.json({ error: 'Failed to activate event trigger' }, { status: 500 });
  }
}

async function autoCreateEventPlayRuns(userId: string, eventName: string): Promise<string[]> {
  const template = await prisma.playTemplate.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { triggerType: 'SIGNAL' },
        { name: { contains: 'Event Invite', mode: 'insensitive' } },
        { name: { contains: 'Event', mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  if (!template) return [];

  const companies = await prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const playRunIds: string[] = [];
  for (const company of companies) {
    try {
      const playRun = await createPlayRunFromTemplate({
        userId,
        companyId: company.id,
        playTemplateId: template.id,
        title: `${eventName} — ${company.name}`,
      });
      playRunIds.push(playRun.id);
    } catch {
      console.warn(`Skipped play run for ${company.name}: create failed`);
    }
  }
  return playRunIds;
}
