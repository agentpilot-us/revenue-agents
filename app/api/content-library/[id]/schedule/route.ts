import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function nextRunAt(frequency: string): Date {
  const d = new Date();
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  return d;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contentLibraryId } = await params;
    if (!contentLibraryId) {
      return NextResponse.json({ error: 'Missing content id' }, { status: 400 });
    }

    const schedule = await prisma.contentLibrarySchedule.findFirst({
      where: { contentLibraryId, userId: session.user.id, isActive: true },
      select: { frequency: true, nextRunAt: true, lastRunAt: true },
    });

    return NextResponse.json({
      frequency: schedule ? schedule.frequency : 'off',
      nextRunAt: schedule?.nextRunAt?.toISOString() ?? null,
      lastRunAt: schedule?.lastRunAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Content library schedule GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contentLibraryId } = await params;
    if (!contentLibraryId) {
      return NextResponse.json({ error: 'Missing content id' }, { status: 400 });
    }

    let body: { frequency?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const frequency = body.frequency === 'weekly' ? 'weekly' : body.frequency === 'daily' ? 'daily' : 'off';

    const item = await prisma.contentLibrary.findFirst({
      where: { id: contentLibraryId, userId: session.user.id },
      select: { id: true, sourceUrl: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (frequency === 'off') {
      await prisma.contentLibrarySchedule.deleteMany({
        where: { contentLibraryId, userId: session.user.id },
      });
      return NextResponse.json({ frequency: 'off', nextRunAt: null });
    }

    if (!item.sourceUrl?.trim()) {
      return NextResponse.json(
        { error: 'Items without a source URL cannot be scheduled' },
        { status: 400 }
      );
    }

    const nextRun = nextRunAt(frequency);

    const schedule = await prisma.contentLibrarySchedule.upsert({
      where: { contentLibraryId },
      create: {
        contentLibraryId,
        userId: session.user.id,
        frequency,
        nextRunAt: nextRun,
        isActive: true,
      },
      update: {
        frequency,
        nextRunAt: nextRun,
        isActive: true,
        updatedAt: new Date(),
      },
      select: { frequency: true, nextRunAt: true },
    });

    return NextResponse.json({
      frequency: schedule.frequency,
      nextRunAt: schedule.nextRunAt.toISOString(),
    });
  } catch (error) {
    console.error('Content library schedule PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
