import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNextTouchContext } from '@/lib/sequences/get-next-touch-context';
import { z } from 'zod';

const postSchema = z.object({
  contactId: z.string().optional(),
  enrollmentId: z.string().optional(),
}).refine((d) => d.contactId ?? d.enrollmentId, { message: 'contactId or enrollmentId required' });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'contactId or enrollmentId required' }, { status: 400 });
    }

    const { contactId, enrollmentId } = parsed.data;
    let context = null;

    if (enrollmentId) {
      const { prisma } = await import('@/lib/db');
      const enrollment = await prisma.contactSequenceEnrollment.findFirst({
        where: { id: enrollmentId, userId: session.user.id },
        include: {
          sequence: { include: { steps: { orderBy: { order: 'asc' } } } },
          contact: true,
        },
      });
      if (enrollment && enrollment.contactId) {
        context = await getNextTouchContext(enrollment.contactId, session.user.id);
        if (context && context.enrollmentId !== enrollmentId) context = null;
      }
    } else if (contactId) {
      context = await getNextTouchContext(contactId, session.user.id);
    }

    if (!context) {
      return NextResponse.json({
        ok: false,
        nextTouch: null,
        message: 'No active enrollment or next touch not due',
      });
    }

    return NextResponse.json({
      ok: true,
      nextTouch: {
        enrollmentId: context.enrollmentId,
        sequenceId: context.sequenceId,
        sequenceName: context.sequenceName,
        contactId: context.contactId,
        currentStepIndex: context.currentStepIndex,
        step: context.step,
        suggestedChannel: context.suggestedChannel,
        promptContext: context.promptContext,
      },
    });
  } catch (e) {
    console.error('POST /api/sequences/next-touch', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
