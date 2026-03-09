import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  enrichBuyingGroup,
  runPerplexityResearchOnly,
} from '@/lib/research/research-company';
import type { BuyingGroupSeed } from '@/lib/research/company-research-schema';

export const maxDuration = 120;

export async function POST(
  _req: NextRequest,
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
      select: { id: true, name: true, domain: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const dept = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
      select: {
        id: true,
        type: true,
        customName: true,
        segmentType: true,
        industry: true,
        useCase: true,
        searchKeywords: true,
        orgDepartment: true,
      },
    });
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const seed: BuyingGroupSeed = {
      id: dept.id,
      name: dept.customName || dept.type.replace(/_/g, ' '),
      rationale: dept.useCase || `Buying group at ${company.name}`,
      segmentType: (dept.segmentType as 'FUNCTIONAL' | 'USE_CASE' | 'DIVISIONAL') || 'FUNCTIONAL',
      orgFunction: dept.orgDepartment || dept.type.replace(/_/g, ' '),
      divisionOrProduct:
        dept.segmentType === 'DIVISIONAL' || dept.segmentType === 'USE_CASE'
          ? dept.customName
          : null,
    };

    const perplexityResult = await runPerplexityResearchOnly(
      company.name,
      company.domain ?? undefined,
      session.user.id,
    );
    if (!perplexityResult.ok) {
      return NextResponse.json(
        { error: perplexityResult.error },
        { status: 400 },
      );
    }

    const result = await enrichBuyingGroup(
      company.name,
      company.domain ?? undefined,
      seed,
      session.user.id,
      perplexityResult.summary,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const detail = result.data;
    const useCaseText = detail.useCasesAtThisCompany?.length
      ? detail.useCasesAtThisCompany.join('\n\n')
      : undefined;

    const updated = await prisma.companyDepartment.update({
      where: { id: departmentId },
      data: {
        valueProp: detail.valueProp,
        useCase: useCaseText,
        targetRoles: detail.roles ?? undefined,
        estimatedOpportunity: detail.estimatedOpportunity ?? undefined,
        objectionHandlers: detail.objectionHandlers ?? undefined,
        whyThisGroupBuys: detail.whyThisGroupBuys ?? undefined,
        searchKeywords: detail.searchKeywords?.length ? detail.searchKeywords : undefined,
        orgDepartment: detail.orgDepartment || undefined,
        seniorityByRole: detail.seniorityByRole ?? undefined,
        industry: detail.industry ?? dept.industry ?? undefined,
        segmentType: detail.segmentType ?? dept.segmentType ?? undefined,
        notes: `AI-enriched: ${detail.name}. ${detail.whyThisGroupBuys ?? ''}`.trim(),
        status: 'RESEARCH_PHASE',
      },
    });

    return NextResponse.json({ ok: true, department: updated });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/departments/[departmentId]/enrich error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enrichment failed' },
      { status: 500 },
    );
  }
}
