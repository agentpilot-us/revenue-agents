import { prisma } from '@/lib/db';
import { DepartmentType, DepartmentStatus, Prisma } from '@prisma/client';

/** DepartmentType enum values in fixed order for 4-step flow (one segment per type to satisfy unique). */
export const DEPARTMENT_TYPES_ORDER: DepartmentType[] = [
  DepartmentType.SALES,
  DepartmentType.MARKETING,
  DepartmentType.REVENUE_OPERATIONS,
  DepartmentType.PRODUCT,
  DepartmentType.ENGINEERING,
  DepartmentType.AUTONOMOUS_VEHICLES,
  DepartmentType.MANUFACTURING_OPERATIONS,
  DepartmentType.CUSTOMER_SUCCESS,
  DepartmentType.INDUSTRIAL_DESIGN,
  DepartmentType.IT_DATA_CENTER,
  DepartmentType.SUPPLY_CHAIN,
  DepartmentType.CONNECTED_SERVICES,
  DepartmentType.EXECUTIVE_LEADERSHIP,
  DepartmentType.FINANCE,
  DepartmentType.LEGAL,
  DepartmentType.HR,
  DepartmentType.OTHER,
];

export type EnrichedGroupForSave = {
  name: string;
  segmentType?: string;
  orgDepartment?: string;
  valueProp?: string;
  useCasesAtThisCompany?: string[];
  whyThisGroupBuys?: string;
  objectionHandlers?: Array<{ objection: string; response: string }>;
  roles?: {
    economicBuyer: string[];
    technicalEvaluator: string[];
    champion: string[];
    influencer: string[];
  };
  searchKeywords?: string[];
  seniorityByRole?: Record<string, string[]>;
  products?: Array<{ productName?: string; productSlug?: string }>;
  estimatedOpportunity?: string;
};

export type CompanyBasicsForSave = {
  name: string;
  website?: string;
  industry?: string;
  employees?: string;
  headquarters?: string;
  revenue?: string;
};

export type Save4StepResult = {
  departmentsCreated: number;
  departmentsUpdated: number;
  productsLinked: number;
};

/**
 * Save 4-step research (companyBasics + enrichedGroups) to Company and CompanyDepartment.
 * Used by apply-research route and by the research/run tool save_research_results.
 */
export async function save4StepResearch(params: {
  companyId: string;
  userId: string;
  company: {
    id: string;
    name: string;
    website: string | null;
    industry: string | null;
    employees: string | null;
    headquarters: string | null;
    revenue: string | null;
  };
  companyBasics: CompanyBasicsForSave;
  enrichedGroups: EnrichedGroupForSave[];
  researchGoal?: string | null;
  researchDataPayload?: Prisma.InputJsonValue;
}): Promise<Save4StepResult> {
  const { companyId, userId, company, companyBasics, enrichedGroups, researchGoal, researchDataPayload } = params;
  const summary: Save4StepResult = { departmentsCreated: 0, departmentsUpdated: 0, productsLinked: 0 };

  const catalogProducts = await prisma.catalogProduct.findMany({
    where: { userId },
    select: { id: true, slug: true, name: true },
  });
  const productNameToId = new Map(catalogProducts.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const productSlugToId = new Map(catalogProducts.map((p) => [p.slug, p.id]));

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: companyBasics.name,
      website: companyBasics.website ?? company.website,
      industry: companyBasics.industry ?? company.industry,
      employees: companyBasics.employees ?? company.employees,
      headquarters: companyBasics.headquarters ?? company.headquarters,
      revenue: companyBasics.revenue ?? company.revenue,
      researchGoal: researchGoal ?? undefined,
      ...(researchDataPayload != null && { researchData: researchDataPayload }),
    },
  });

  for (let i = 0; i < enrichedGroups.length; i++) {
    const segment = enrichedGroups[i];
    const departmentType = DEPARTMENT_TYPES_ORDER[i % DEPARTMENT_TYPES_ORDER.length];
    const existingDept = await prisma.companyDepartment.findUnique({
      where: { companyId_type: { companyId, type: departmentType } },
    });
    const useCaseText =
      segment.useCasesAtThisCompany?.length
        ? segment.useCasesAtThisCompany.join('\n\n')
        : null;
    const deptData = {
      companyId,
      type: departmentType,
      customName: segment.name,
      status: DepartmentStatus.RESEARCH_PHASE as DepartmentStatus,
      useCase: useCaseText,
      targetRoles: segment.roles ?? undefined,
      estimatedOpportunity: segment.estimatedOpportunity ?? undefined,
      valueProp: segment.valueProp ?? undefined,
      objectionHandlers: segment.objectionHandlers ?? undefined,
      notes: `AI-generated (4-step): ${segment.name}. ${segment.whyThisGroupBuys ?? ''}`.trim(),
      segmentType: segment.segmentType ?? undefined,
      searchKeywords: segment.searchKeywords ?? undefined,
      orgDepartment: segment.orgDepartment ?? undefined,
      seniorityByRole: segment.seniorityByRole ?? undefined,
      whyThisGroupBuys: segment.whyThisGroupBuys ?? undefined,
    };
    let dept;
    if (existingDept) {
      dept = await prisma.companyDepartment.update({
        where: { id: existingDept.id },
        data: deptData,
      });
      summary.departmentsUpdated++;
    } else {
      dept = await prisma.companyDepartment.create({ data: deptData });
      summary.departmentsCreated++;
    }
    for (const pf of segment.products ?? []) {
      const productId =
        productNameToId.get((pf.productName ?? pf.productSlug ?? '').trim().toLowerCase()) ??
        productSlugToId.get(pf.productSlug ?? '');
      if (productId) {
        await prisma.companyProduct.upsert({
          where: {
            companyId_companyDepartmentId_productId: {
              companyId,
              companyDepartmentId: dept.id,
              productId,
            },
          },
          create: {
            companyId,
            companyDepartmentId: dept.id,
            productId,
            status: 'OPPORTUNITY',
          },
          update: {},
        });
        summary.productsLinked++;
      }
    }
  }
  return summary;
}
