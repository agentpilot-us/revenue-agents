import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { EnrollmentStatus } from '@prisma/client';

const patchSchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'exited']).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const enrollment = await prisma.contactSequenceEnrollment.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    if (data.status) {
      const statusMap = {
        active: EnrollmentStatus.active,
        paused: EnrollmentStatus.paused,
        completed: EnrollmentStatus.completed,
        exited: EnrollmentStatus.exited,
      };
      await prisma.contactSequenceEnrollment.update({
        where: { id },
        data: {
          status: statusMap[data.status],
          ...(data.status === 'completed' && { completedAt: new Date(), nextTouchDueAt: null }),
          updatedAt: new Date(),
        },
      });
    }

    const updated = await prisma.contactSequenceEnrollment.findUnique({
      where: { id },
      include: { sequence: { select: { name: true } } },
    });

    return NextResponse.json({
      id: updated!.id,
      status: updated!.status,
      currentStepIndex: updated!.currentStepIndex,
      nextTouchDueAt: updated!.nextTouchDueAt?.toISOString() ?? null,
      completedAt: updated!.completedAt?.toISOString() ?? null,
      sequenceName: updated!.sequence.name,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error('PATCH /api/enrollments/[id]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
