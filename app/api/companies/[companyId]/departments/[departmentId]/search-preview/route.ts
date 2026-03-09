import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  resolveSearchContext,
  type SeniorityLevel,
} from '@/lib/contacts/resolve-search-context';

const VALID_SENIORITY: SeniorityLevel[] = ['specialist', 'manager_director', 'vp', 'c_level'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; departmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, departmentId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { segmentationStrategy: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const department = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
      select: {
        type: true,
        customName: true,
        targetRoles: true,
        useCase: true,
        seniorityByRole: true,
        searchKeywords: true,
      },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const seniorityParam = req.nextUrl.searchParams.get('seniority');
    const seniorityLevels: SeniorityLevel[] = seniorityParam
      ? (seniorityParam.split(',').filter((s) => VALID_SENIORITY.includes(s as SeniorityLevel)) as SeniorityLevel[])
      : [];

    const context = resolveSearchContext(
      {
        customName: department.customName,
        type: department.type,
        targetRoles: department.targetRoles as Parameters<typeof resolveSearchContext>[0]['targetRoles'],
        useCase: department.useCase,
        seniorityByRole: department.seniorityByRole as Record<string, string> | null,
        searchKeywords: department.searchKeywords as string[] | null,
      },
      company.segmentationStrategy,
      seniorityLevels,
    );

    return NextResponse.json(context);
  } catch (error) {
    console.error('[search-preview] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
