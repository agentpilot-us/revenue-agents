import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const relationshipSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  relationship: z.enum(['upgrade_path', 'complementary', 'prerequisite', 'replacement']),
});

const bodySchema = z.object({
  relationships: z.array(relationshipSchema),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await params;
  const product = await prisma.catalogProduct.findFirst({
    where: { id: productId, userId: session.user.id },
    select: { id: true, name: true, relatedProducts: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({
    productId: product.id,
    productName: product.name,
    relationships: (product.relatedProducts as unknown[]) ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await params;

  const product = await prisma.catalogProduct.findFirst({
    where: { id: productId, userId: session.user.id },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { relationships } = parsed.data;

  // Validate that all referenced products exist and belong to this user
  if (relationships.length > 0) {
    const refIds = relationships.map((r) => r.productId);
    const existing = await prisma.catalogProduct.findMany({
      where: { id: { in: refIds }, userId: session.user.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));
    const missing = refIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Referenced products not found: ${missing.join(', ')}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.catalogProduct.update({
    where: { id: productId },
    data: { relatedProducts: relationships },
    select: { id: true, name: true, relatedProducts: true },
  });

  return NextResponse.json({
    productId: updated.id,
    productName: updated.name,
    relationships: updated.relatedProducts,
  });
}
