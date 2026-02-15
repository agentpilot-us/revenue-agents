import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { EnrollmentStatus } from '@prisma/client';

const postSchema = z.object({
  contactId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sequenceId } = await params;
    const sequence = await prisma.outreachSequence.findFirst({
      where: { id: sequenceId, userId: session.user.id },
    });
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    const enrollments = await prisma.contactSequenceEnrollment.findMany({
      where: { sequenceId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json({
      enrollments: enrollments.map((e) => ({
        id: e.id,
        contactId: e.contactId,
        status: e.status,
        currentStepIndex: e.currentStepIndex,
        enrolledAt: e.enrolledAt.toISOString(),
        nextTouchDueAt: e.nextTouchDueAt?.toISOString() ?? null,
        completedAt: e.completedAt?.toISOString() ?? null,
        contact: e.contact,
      })),
    });
  } catch (e) {
    console.error('GET /api/sequences/[id]/enrollments', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sequenceId } = await params;
    const sequence = await prisma.outreachSequence.findFirst({
      where: { id: sequenceId, userId: session.user.id },
      include: { steps: { orderBy: { order: 'asc' }, take: 1 } },
    });
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    const body = await req.json();
    const { contactId, contactIds } = postSchema.parse(body);
    const ids = contactIds ?? (contactId ? [contactId] : []);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'contactId or contactIds required' }, { status: 400 });
    }

    const firstStep = sequence.steps[0];
    const nextTouchDueAt = firstStep
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + firstStep.dayOffset);
          return d;
        })()
      : new Date();

    const created: string[] = [];
    const skipped: string[] = [];

    for (const cid of ids) {
      const contact = await prisma.contact.findFirst({
        where: { id: cid },
        select: { id: true, companyId: true },
      });
      if (!contact) {
        skipped.push(cid);
        continue;
      }
      const company = await prisma.company.findFirst({
        where: { id: contact.companyId, userId: session.user.id },
      });
      if (!company) {
        skipped.push(cid);
        continue;
      }

      const existing = await prisma.contactSequenceEnrollment.findUnique({
        where: {
          contactId_sequenceId: { contactId: cid, sequenceId },
        },
      });
      if (existing) {
        skipped.push(cid);
        continue;
      }

      await prisma.contactSequenceEnrollment.create({
        data: {
          contactId: cid,
          sequenceId,
          userId: session.user.id,
          status: EnrollmentStatus.active,
          currentStepIndex: 0,
          nextTouchDueAt,
        },
      });
      created.push(cid);
    }

    return NextResponse.json({
      ok: true,
      enrolled: created.length,
      skipped: skipped.length,
      contactIds: created,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error('POST /api/sequences/[id]/enrollments', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
