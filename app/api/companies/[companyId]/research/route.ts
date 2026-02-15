import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { researchCompanyForAccount } from '@/lib/research/research-company';

export const maxDuration = 60;

export async function POST(
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
      select: { id: true, name: true, domain: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await researchCompanyForAccount(company.name, company.domain ?? undefined);

    if (!result.ok) {
      console.error('Research failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Research failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Research failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
