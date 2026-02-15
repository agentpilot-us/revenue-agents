import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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
      include: {
        departments: {
          where: {
            OR: [
              { useCase: { not: null } },
              { targetRoles: { not: null } },
              { estimatedOpportunity: { not: null } },
            ],
          },
          select: {
            type: true,
            customName: true,
            useCase: true,
            targetRoles: true,
            estimatedOpportunity: true,
            companyProducts: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      select: {
        employees: true,
        headquarters: true,
        revenue: true,
        businessOverview: true,
        keyInitiatives: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      employees: company.employees,
      headquarters: company.headquarters,
      revenue: company.revenue,
      businessOverview: company.businessOverview,
      keyInitiatives: company.keyInitiatives,
      departments: company.departments,
    });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/research-data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research data' },
      { status: 500 }
    );
  }
}
