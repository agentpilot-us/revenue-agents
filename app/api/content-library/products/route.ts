import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
});

/**
 * GET /api/content-library/products
 * List user's Product records (content library products, not catalog products).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, description: true, category: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error('GET /api/content-library/products', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content-library/products
 * Create a Product (content library product with name, description, category).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || undefined,
        category: parsed.data.category?.trim() || undefined,
      },
    });

    return NextResponse.json(product);
  } catch (e) {
    console.error('POST /api/content-library/products', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}
