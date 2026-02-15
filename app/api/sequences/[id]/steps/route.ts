import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { SequenceChannel } from '@prisma/client';

const postSchema = z.object({
  order: z.number().int().min(0),
  dayOffset: z.number().int().min(0),
  channel: z.nativeEnum(SequenceChannel),
  role: z.string(),
  promptTemplate: z.string().optional().nullable(),
  ctaType: z.string().optional().nullable(),
});

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
    });
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    const body = await req.json();
    const { order, dayOffset, channel, role, promptTemplate, ctaType } = postSchema.parse(body);

    const step = await prisma.outreachSequenceStep.create({
      data: {
        sequenceId,
        order,
        dayOffset,
        channel,
        role,
        promptTemplate: promptTemplate ?? null,
        ctaType: ctaType ?? null,
      },
    });

    return NextResponse.json({
      id: step.id,
      order: step.order,
      dayOffset: step.dayOffset,
      channel: step.channel,
      role: step.role,
      promptTemplate: step.promptTemplate,
      ctaType: step.ctaType,
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error('POST /api/sequences/[id]/steps', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
