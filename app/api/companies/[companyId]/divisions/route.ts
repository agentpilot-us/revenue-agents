import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// GET /api/companies/[companyId]/divisions
// Lightweight "Divisions" view over CompanyDepartment for trigger-to-content flows.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const departments = await prisma.companyDepartment.findMany({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        type: true,
        customName: true,
        status: true,
        _count: {
          select: {
            contacts: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const divisions = departments.map((d) => ({
      id: d.id,
      companyId: d.companyId,
      name: d.customName || d.type.replace(/_/g, ' '),
      type: d.type,
      status: d.status,
      contactCount: d._count.contacts,
    }));

    return NextResponse.json({ divisions });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/divisions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch divisions' },
      { status: 500 }
    );
  }
}

