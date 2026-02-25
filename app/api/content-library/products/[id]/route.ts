import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
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
    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, name: true, description: true, category: true, createdAt: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (e) {
    console.error('GET /api/content-library/products/[id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

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
    const product = await prisma.product.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const body = await req.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name.trim() }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description?.trim() || null }),
        ...(parsed.data.category !== undefined && { category: parsed.data.category?.trim() || null }),
      },
      select: { id: true, name: true, description: true, category: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/content-library/products/[id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    await prisma.product.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('DELETE /api/content-library/products/[id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
