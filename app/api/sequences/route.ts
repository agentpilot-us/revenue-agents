import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const postSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequences = await prisma.outreachSequence.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { steps: true, enrollments: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      sequences: sequences.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        isDefault: s.isDefault,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        stepCount: s._count.steps,
        enrollmentCount: s._count.enrollments,
      })),
    });
  } catch (e) {
    console.error('GET /api/sequences', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, isDefault } = postSchema.parse(body);

    const sequence = await prisma.outreachSequence.create({
      data: {
        userId: session.user.id,
        name,
        description: description ?? null,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({
      id: sequence.id,
      name: sequence.name,
      description: sequence.description,
      isDefault: sequence.isDefault,
      createdAt: sequence.createdAt.toISOString(),
      updatedAt: sequence.updatedAt.toISOString(),
      steps: [],
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error('POST /api/sequences', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
