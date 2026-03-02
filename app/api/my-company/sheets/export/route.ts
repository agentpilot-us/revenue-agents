import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // @ts-expect-error MyCompanySheetConfig model is newly added; Prisma client types may not be regenerated yet.
  const config = await prisma.myCompanySheetConfig.findUnique({
    where: { userId },
  });

  const [companyCount, contactCount, roadmapCount, productCount, signalCount] =
    await Promise.all([
      prisma.company.count({ where: { userId } }),
      prisma.contact.count({ where: { company: { userId } } }),
      prisma.adaptiveRoadmap.count({ where: { userId } }),
      prisma.companyProduct.count({ where: { company: { userId } } }),
      prisma.accountSignal.count({ where: { company: { userId } } }),
    ]);

  const today = new Date().toISOString().split('T')[0];

  const rows: (string | number)[][] = [
    ['Date', 'Accounts', 'Contacts', 'Roadmaps', 'Products', 'Signals'],
    [today, companyCount, contactCount, roadmapCount, productCount, signalCount],
  ];

  return NextResponse.json({
    spreadsheetId: config?.spreadsheetId ?? null,
    sheetName: config?.sheetName ?? null,
    rows,
  });
}

