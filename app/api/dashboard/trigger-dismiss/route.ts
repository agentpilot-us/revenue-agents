import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/dashboard/trigger-dismiss
 * Returns list of trigger IDs the user has dismissed.
 * Stored in user.alertSettings.dismissedTriggers (user-scoped Json).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { alertSettings: true },
    });

    const settings = (user?.alertSettings ?? {}) as Record<string, unknown>;
    const dismissed = Array.isArray(settings.dismissedTriggers)
      ? settings.dismissedTriggers
      : [];

    return NextResponse.json({ dismissed });
  } catch (error) {
    console.error('GET /api/dashboard/trigger-dismiss error:', error);
    return NextResponse.json({ dismissed: [] });
  }
}

/**
 * POST /api/dashboard/trigger-dismiss
 * Body: { triggerId: string }
 * Persists a user-scoped trigger dismissal in alertSettings.dismissedTriggers.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { triggerId } = await req.json();
    if (!triggerId) {
      return NextResponse.json({ error: 'triggerId required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { alertSettings: true },
    });

    const settings = (user?.alertSettings ?? {}) as Record<string, unknown>;
    const existing = Array.isArray(settings.dismissedTriggers)
      ? (settings.dismissedTriggers as string[])
      : [];

    if (!existing.includes(triggerId)) {
      existing.push(triggerId);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        alertSettings: {
          ...settings,
          dismissedTriggers: existing,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/dashboard/trigger-dismiss error:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss trigger' },
      { status: 500 },
    );
  }
}
