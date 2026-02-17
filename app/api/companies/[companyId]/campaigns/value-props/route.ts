import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getValuePropsForDepartment } from '@/lib/prompt-context';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    if (!departmentId) {
      return NextResponse.json(
        { error: 'departmentId is required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const department = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
      select: { id: true, type: true, customName: true },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const valueProps = await getValuePropsForDepartment(
      session.user.id,
      company.industry ?? null,
      { type: department.type, customName: department.customName }
    );

    return NextResponse.json(valueProps ?? { headline: '', pitch: '', bullets: [], cta: '' });
  } catch (e) {
    console.error('GET value-props', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
