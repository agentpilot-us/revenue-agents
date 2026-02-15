import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contactId } = await params;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId },
      select: { id: true, companyId: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const company = await prisma.company.findFirst({
      where: { id: contact.companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const enrollments = await prisma.contactSequenceEnrollment.findMany({
      where: { contactId, userId: session.user.id, status: 'active' },
      include: {
        sequence: { select: { id: true, name: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const steps = await Promise.all(
      enrollments.map(async (e) => {
        const stepCount = await prisma.outreachSequenceStep.count({
          where: { sequenceId: e.sequenceId },
        });
        return { enrollment: e, stepCount };
      })
    );

    return NextResponse.json({
      enrollments: steps.map(({ enrollment, stepCount }) => ({
        id: enrollment.id,
        sequenceId: enrollment.sequenceId,
        sequenceName: enrollment.sequence.name,
        currentStepIndex: enrollment.currentStepIndex,
        stepCount,
        nextTouchDueAt: enrollment.nextTouchDueAt?.toISOString() ?? null,
        enrolledAt: enrollment.enrolledAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('GET /api/contacts/[id]/enrollments', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
