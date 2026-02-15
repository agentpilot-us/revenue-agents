import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/user/products
 * Get all products for the current user
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Failed to fetch user products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
