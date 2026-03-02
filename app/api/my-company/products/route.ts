import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const products = await prisma.companyProduct.findMany({
    where: {
      company: {
        userId,
      },
    },
    select: {
      id: true,
      status: true,
      arr: true,
      opportunitySize: true,
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({ products });
}

