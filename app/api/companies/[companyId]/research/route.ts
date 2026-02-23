import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { researchCompanyForAccount } from '@/lib/research/research-company';
import { isDemoAccount } from '@/lib/demo/is-demo-account';
import type { CompanyResearchData } from '@/lib/research/company-research-schema';

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

    if (await isDemoAccount(companyId)) {
      const existing = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        select: {
          researchData: true,
          businessOverview: true,
          keyInitiatives: true,
          segmentationStrategy: true,
          segmentationRationale: true,
          employees: true,
          headquarters: true,
          revenue: true,
          website: true,
          industry: true,
        },
      });
      if (!existing?.researchData || typeof existing.researchData !== 'object') {
        return NextResponse.json(
          { error: 'Demo account has no research data.' },
          { status: 400 }
        );
      }
      const data = existing.researchData as unknown as CompanyResearchData;
      return NextResponse.json({ data });
    }

    const result = await researchCompanyForAccount(
      company.name,
      company.domain ?? undefined,
      session.user.id
    );

    if (!result.ok) {
      const msg = result.error || 'Research failed';
      const isSetupRequired =
        msg.includes('company setup') || msg.includes('Content Library');
      if (isSetupRequired) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error('Research failed:', result.error);
      return NextResponse.json({ error: msg }, { status: 500 });
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
