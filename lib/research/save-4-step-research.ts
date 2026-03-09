import { prisma } from '@/lib/db';
import { DepartmentType, DepartmentStatus, Prisma } from '@prisma/client';

/** DepartmentType enum values in fixed order for fallback assignment (one segment per type to satisfy unique). */
export const DEPARTMENT_TYPES_ORDER: DepartmentType[] = [
  DepartmentType.SALES,
  DepartmentType.MARKETING,
  DepartmentType.REVENUE_OPERATIONS,
  DepartmentType.PRODUCT,
  DepartmentType.ENGINEERING,
  DepartmentType.CUSTOMER_SUCCESS,
  DepartmentType.IT_INFRASTRUCTURE,
  DepartmentType.SUPPLY_CHAIN,
  DepartmentType.OPERATIONS,
  DepartmentType.SECURITY,
  DepartmentType.DATA_ANALYTICS,
  DepartmentType.PROCUREMENT,
  DepartmentType.PARTNERSHIPS,
  DepartmentType.EXECUTIVE_LEADERSHIP,
  DepartmentType.FINANCE,
  DepartmentType.LEGAL,
  DepartmentType.HR,
  DepartmentType.OTHER,
];

/** Keywords for semantic matching of group names to DepartmentType. */
const DEPARTMENT_TYPE_KEYWORDS: Record<DepartmentType, string[]> = {
  [DepartmentType.SALES]: ['sales', 'revenue', 'account', 'business development', 'bdr', 'sdr', 'account executive', 'ae'],
  [DepartmentType.MARKETING]: ['marketing', 'brand', 'advertising', 'content', 'demand gen', 'growth', 'crm'],
  [DepartmentType.CUSTOMER_SUCCESS]: ['customer success', 'cs', 'support', 'customer experience', 'cx', 'success'],
  [DepartmentType.REVENUE_OPERATIONS]: ['revops', 'revenue operations', 'sales ops', 'go-to-market', 'gtm'],
  [DepartmentType.PRODUCT]: ['product', 'pd', 'product management', 'pm', 'design', 'ux'],
  [DepartmentType.ENGINEERING]: ['engineering', 'dev', 'software', 'development', 'r&d', 'rd', 'tech'],
  [DepartmentType.IT_INFRASTRUCTURE]: ['it', 'infrastructure', 'devops', 'data center', 'platform', 'cloud', 'systems', 'information technology'],
  [DepartmentType.SUPPLY_CHAIN]: ['supply chain', 'logistics', 'sourcing'],
  [DepartmentType.OPERATIONS]: ['operations', 'manufacturing', 'production', 'plant', 'factory', 'fulfillment'],
  [DepartmentType.SECURITY]: ['security', 'cybersecurity', 'infosec', 'risk', 'soc', 'ciso'],
  [DepartmentType.DATA_ANALYTICS]: ['data', 'analytics', 'bi', 'business intelligence', 'data science', 'ml', 'ai'],
  [DepartmentType.PROCUREMENT]: ['procurement', 'purchasing', 'vendor management'],
  [DepartmentType.PARTNERSHIPS]: ['partnerships', 'alliances', 'channel', 'partner', 'ecosystem', 'co-sell'],
  [DepartmentType.EXECUTIVE_LEADERSHIP]: ['executive', 'leadership', 'c-level', 'c-suite', 'ceo', 'cfo', 'coo', 'cto'],
  [DepartmentType.FINANCE]: ['finance', 'fp&a', 'accounting', 'treasury', 'controller'],
  [DepartmentType.LEGAL]: ['legal', 'compliance', 'general counsel', 'gc'],
  [DepartmentType.HR]: ['hr', 'human resources', 'talent', 'people', 'recruiting', 'workforce'],
  [DepartmentType.OTHER]: [],
};

const MIN_SEMANTIC_SCORE_THRESHOLD = 1;

function scoreGroupNameForDepartmentType(groupName: string, deptType: DepartmentType): number {
  const keywords = DEPARTMENT_TYPE_KEYWORDS[deptType];
  if (keywords.length === 0) return 0;
  const lower = groupName.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw)).length;
}

function pickDepartmentTypeForGroup(
  groupName: string,
  _alreadyAssigned: Set<DepartmentType>
): DepartmentType {
  let bestType: DepartmentType | null = null;
  let bestScore = 0;

  for (const deptType of DEPARTMENT_TYPES_ORDER) {
    const score = scoreGroupNameForDepartmentType(groupName, deptType);
    if (score > bestScore && score >= MIN_SEMANTIC_SCORE_THRESHOLD) {
      bestScore = score;
      bestType = deptType;
    }
  }

  // Use the best semantic match, or OTHER if nothing fits.
  // The real identity lives in customName + searchKeywords; the enum is advisory.
  return bestType ?? DepartmentType.OTHER;
}

export type EnrichedGroupForSave = {
  name: string;
  segmentType?: string;
  orgDepartment?: string;
  industry?: string;
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

  const segTypes = enrichedGroups
    .map((g) => g.segmentType?.toUpperCase())
    .filter(Boolean) as string[];
  const hasDivisional = segTypes.includes('DIVISIONAL');
  const hasUseCase = segTypes.includes('USE_CASE');
  const hasFunctional = segTypes.includes('FUNCTIONAL');
  let inferredStrategy: string;
  if (hasDivisional && !hasFunctional && !hasUseCase) inferredStrategy = 'DIVISIONAL';
  else if (hasUseCase && !hasFunctional && !hasDivisional) inferredStrategy = 'USE_CASE';
  else if (hasFunctional && !hasDivisional && !hasUseCase) inferredStrategy = 'FUNCTIONAL';
  else inferredStrategy = 'HYBRID';

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
      segmentationStrategy: inferredStrategy,
      ...(researchDataPayload != null && { researchData: researchDataPayload }),
    },
  });

  const assignedTypes = new Set<DepartmentType>();
  const createdDeptIds: Array<{ id: string; name: string }> = [];

  for (const segment of enrichedGroups) {
    const departmentType = pickDepartmentTypeForGroup(segment.name, assignedTypes);
    assignedTypes.add(departmentType);
    const existingDept = await prisma.companyDepartment.findFirst({
      where: { companyId, customName: segment.name },
    }) ?? await prisma.companyDepartment.findFirst({
      where: { companyId, type: departmentType },
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
      industry: segment.industry ?? undefined,
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
    createdDeptIds.push({ id: dept.id, name: segment.name });
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
  // Auto-create Strategic Account Plan scaffolding (AdaptiveRoadmap + RoadmapTargets)
  if (createdDeptIds.length > 0) {
    const roadmap = await prisma.adaptiveRoadmap.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: {
        userId,
        companyId,
        roadmapType: 'account_plan',
        objective: researchGoal
          ? ({ goalText: researchGoal } as Prisma.InputJsonValue)
          : undefined,
      },
      update: {
        ...(researchGoal
          ? { objective: { goalText: researchGoal } as Prisma.InputJsonValue }
          : {}),
      },
    });

    const existingCompanyTarget = await prisma.roadmapTarget.findFirst({
      where: { roadmapId: roadmap.id, targetType: 'company', companyId },
    });
    const companyTargetId =
      existingCompanyTarget?.id ??
      (
        await prisma.roadmapTarget.create({
          data: {
            roadmapId: roadmap.id,
            targetType: 'company',
            name: companyBasics.name,
            companyId,
          },
        })
      ).id;

    for (const dept of createdDeptIds) {
      const exists = await prisma.roadmapTarget.findFirst({
        where: {
          roadmapId: roadmap.id,
          targetType: 'division',
          companyDepartmentId: dept.id,
        },
      });
      if (!exists) {
        await prisma.roadmapTarget.create({
          data: {
            roadmapId: roadmap.id,
            targetType: 'division',
            name: dept.name,
            companyId,
            companyDepartmentId: dept.id,
            parentTargetId: companyTargetId,
          },
        });
      }
    }
  }

  return summary;
}
