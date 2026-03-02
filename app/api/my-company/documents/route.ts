import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const CreateDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: z.string().optional(),
  url: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const docs = await prisma.internalDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = CreateDocumentSchema.parse(json);

    const doc = await prisma.internalDocument.create({
      data: {
        userId: session.user.id,
        title: input.title,
        description: input.description,
        source: input.source,
        url: input.url,
        tags: input.tags ?? [],
        metadata: input.metadata ?? null,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('POST /api/my-company/documents error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

