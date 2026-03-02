import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const [companyCount, contactCount, roadmapCount, productCount, signalCount] =
    await Promise.all([
      prisma.company.count({ where: { userId } }),
      prisma.contact.count({
        where: { company: { userId } },
      }),
      prisma.adaptiveRoadmap.count({ where: { userId } }),
      prisma.companyProduct.count({
        where: { company: { userId } },
      }),
      prisma.accountSignal.count({
        where: { company: { userId } },
      }),
    ]);

  return NextResponse.json({
    companyCount,
    contactCount,
    roadmapCount,
    productCount,
    signalCount,
  });
}

