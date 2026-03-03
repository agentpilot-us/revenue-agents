import { prisma } from '@/lib/db';
import { DepartmentType, DepartmentStatus, Prisma } from '@prisma/client';

/** DepartmentType enum values in fixed order for fallback assignment (one segment per type to satisfy unique). */
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

/** Keywords for semantic matching of group names to DepartmentType. */
const DEPARTMENT_TYPE_KEYWORDS: Record<DepartmentType, string[]> = {
  [DepartmentType.SALES]: ['sales', 'revenue', 'account', 'business development', 'bdr', 'sdr', 'account executive', 'ae'],
  [DepartmentType.MARKETING]: ['marketing', 'brand', 'advertising', 'content', 'demand gen', 'growth', 'crm'],
  [DepartmentType.CUSTOMER_SUCCESS]: ['customer success', 'cs', 'support', 'customer experience', 'cx', 'success'],
  [DepartmentType.REVENUE_OPERATIONS]: ['revops', 'revenue operations', 'sales ops', 'go-to-market', 'gtm'],
  [DepartmentType.PRODUCT]: ['product', 'pd', 'product management', 'pm'],
  [DepartmentType.ENGINEERING]: ['engineering', 'dev', 'software', 'development', 'r&d', 'rd', 'tech'],
  [DepartmentType.AUTONOMOUS_VEHICLES]: ['autonomous', 'vehicles', 'av', 'self-driving', 'adas'],
  [DepartmentType.MANUFACTURING_OPERATIONS]: ['manufacturing', 'operations', 'production', 'plant', 'factory'],
  [DepartmentType.INDUSTRIAL_DESIGN]: ['industrial design', 'design', 'styling', 'design studio'],
  [DepartmentType.IT_DATA_CENTER]: ['it', 'infrastructure', 'devops', 'data center', 'platform', 'cloud'],
  [DepartmentType.SUPPLY_CHAIN]: ['supply chain', 'procurement', 'logistics', 'sourcing', 'purchasing'],
  [DepartmentType.CONNECTED_SERVICES]: ['connected', 'services', 'mobility', 'telematics', 'connected services'],
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
  alreadyAssigned: Set<DepartmentType>
): DepartmentType {
  let bestType: DepartmentType | null = null;
  let bestScore = 0;

  for (const deptType of DEPARTMENT_TYPES_ORDER) {
    if (alreadyAssigned.has(deptType)) continue;
    const score = scoreGroupNameForDepartmentType(groupName, deptType);
    if (score > bestScore && score >= MIN_SEMANTIC_SCORE_THRESHOLD) {
      bestScore = score;
      bestType = deptType;
    }
  }

  if (bestType) return bestType;

  // No semantic match above threshold: use first available unassigned type
  for (const deptType of DEPARTMENT_TYPES_ORDER) {
    if (!alreadyAssigned.has(deptType)) return deptType;
  }
  return DepartmentType.OTHER;
}

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

  const assignedTypes = new Set<DepartmentType>();

  for (const segment of enrichedGroups) {
    const departmentType = pickDepartmentTypeForGroup(segment.name, assignedTypes);
    assignedTypes.add(departmentType);
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
