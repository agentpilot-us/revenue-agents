import { prisma } from '@/lib/db';
import { DepartmentType, Prisma } from '@prisma/client';
import { ContentType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type CatalogProduct = {
  name: string;
  slug: string;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  targetDepartments: string[] | null;
};

export type ContentLibraryContext = {
  useCases: { title: string; summary: string; industry?: string | null }[];
  caseStudies: { title: string; outcome: string; industry?: string | null; department?: string | null }[];
  frameworks: { name: string; summary: string }[];
  industryPlaybooks: { industry: string; painPoints: string; messaging: string }[];
  events: { name: string; description: string | null; date?: string | null }[];
};

type PromptOptions = {
  sellerCompanyName?: string;
  sellerWebsite?: string;
  sellerDescription?: string;
  contentLibrary?: ContentLibraryContext;
  /** RAG chunk contents from uploaded Content Library files (for value props and proof points). */
  ragChunks?: string[];
};

// ─────────────────────────────────────────────────────────────
// Main system prompt builder
// ─────────────────────────────────────────────────────────────

/**
 * Build the system prompt for account intelligence.
 *
 * 1. Understand the TARGET company deeply (structure, initiatives, priorities)
 * 2. Know OUR company's story (products, use cases, proof points, frameworks)
 * 3. Synthesize — per buying segment — value prop, use cases, and roles that
 *    connect our story to their reality.
 */
export function buildCompanyResearchPrompt(
  catalogProducts: CatalogProduct[],
  options?: PromptOptions
): string {
  const departmentTypes = Object.values(DepartmentType).join(', ');

  const sellerBlock = buildSellerBlock(options);
  const productBlock = buildProductBlock(catalogProducts);
  const contentBlock = options?.contentLibrary
    ? buildContentLibraryBlock(options.contentLibrary)
    : '';
  const ragBlock = options?.ragChunks?.length
    ? buildRAGBlock(options.ragChunks)
    : '';

  return `${sellerBlock}

${productBlock}

${contentBlock}
${ragBlock ? `\n${ragBlock}\n` : ''}

DEPARTMENT TYPES — use exact enum values when matching departments:
${departmentTypes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASK: ACCOUNT INTELLIGENCE SYNTHESIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Given the target company research below, produce the following sections:

1. COMPANY BASICS
   Extract: companyName, website, industry, employees (e.g. "~167,000"),
   headquarters, revenue (e.g. "$171.8B (2024)").

2. BUSINESS OVERVIEW
   businessOverview: 2–3 sentence summary of what they do. keyInitiatives: specific,
   actionable strategic initiatives (not generic). Pull from recent press, earnings, job postings.

3. SEGMENTATION STRATEGY
   Choose how to best segment buying groups at this company:
   - FUNCTIONAL: by department (Sales, Marketing, Finance, IT, Operations)
   - USE_CASE: by how they'd use the product (Revenue Growth, Cost Reduction, Compliance)
   - DIVISIONAL: by business unit or product line
   - HYBRID: mix of the above
   Set segmentationStrategy and segmentationRationale (why this approach for this company).

4. MICRO-SEGMENTS (buying groups) — REQUIRED, at least one
   For each segment provide:
   a) name, departmentType (enum if match), customName (if needed), whyThisGroupMatters
   b) valueProp: 2–3 sentences, lead with their pain/initiative, reference their context
   c) useCasesAtThisCompany: 2–3 concrete use cases at this company with expected outcome
   d) proofPoints: relevant case studies / playbooks from our Content Library (by name)
   e) relevantEvents: events from our Content Library to invite this group to (by name)
   f) objectionHandlers: 2–3 { objection, response } pairs grounded in our proof points
   g) targetRoles: economicBuyer, technicalEvaluator, champion, influencer — each array min 1, searchable LinkedIn titles
   h) products: array of { productSlug, productName, relevance, estimatedOpportunity } from our catalog
   i) estimatedOpportunity: e.g. "$500K – $2M" for the segment

5. accountLevelObjections (optional): shared objections at account level if applicable.
6. techStack (optional): known tools/vendors for integration messaging.

RULES:
- All product names must match the catalog exactly.
- Value propositions must reference the target company's actual context.
- Use the RAG (uploaded file content) section when present to ground value propositions and proof points; cite or paraphrase from it where relevant.
- Roles must be real, searchable LinkedIn titles.
- If the target is in a different industry, bridge the gap: why our solution still applies.
- Do not return empty microSegments.`;
}

// ─────────────────────────────────────────────────────────────
// Block builders
// ─────────────────────────────────────────────────────────────

function buildSellerBlock(options?: PromptOptions): string {
  if (!options?.sellerCompanyName && !options?.sellerWebsite) {
    return 'You are an account intelligence AI. Research the target company and identify the best buying segments, value propositions, and contacts for a B2B sales engagement.';
  }

  const name = options.sellerCompanyName ?? 'our company';
  const website = options.sellerWebsite ? ` (${options.sellerWebsite})` : '';
  const description = options.sellerDescription
    ? `\n\nWhat we do: ${options.sellerDescription}`
    : '';

  return `You are an account intelligence AI working on behalf of ${name}${website}.${description}

Your job is to research the TARGET company and produce a complete account intelligence brief that:
- Identifies the best buying segments at the target company
- Generates value propositions that connect OUR story to THEIR priorities
- Surfaces use cases specific to how THEY would use our products
- Recommends the right contacts (titles) to engage in each segment`;
}

function buildProductBlock(catalogProducts: CatalogProduct[]): string {
  if (catalogProducts.length === 0) return '';

  const productList = catalogProducts
    .map(
      (p) =>
        `  • ${p.name}
    Description: ${p.description || 'No description'}
    Price: ${p.priceMin ? `$${p.priceMin.toLocaleString()}` : '—'} – ${p.priceMax ? `$${p.priceMax.toLocaleString()}` : '—'}
    Best for departments: ${p.targetDepartments?.join(', ') || 'Various'}`
    )
    .join('\n\n');

  return `OUR PRODUCT CATALOG (use exact product name when referencing products):
${productList}`;
}

function buildContentLibraryBlock(lib: ContentLibraryContext): string {
  const sections: string[] = ['OUR CONTENT LIBRARY (use this to ground value props and proof points):'];

  if (lib.useCases.length > 0) {
    sections.push('\nUse Cases:');
    lib.useCases.forEach((uc) => {
      const industry = uc.industry ? ` [${uc.industry}]` : '';
      sections.push(`  • ${uc.title}${industry}: ${uc.summary}`);
    });
  }

  if (lib.caseStudies.length > 0) {
    sections.push('\nCase Studies / Success Stories:');
    lib.caseStudies.forEach((cs) => {
      const tags = [cs.industry, cs.department].filter(Boolean).join(', ');
      const tagStr = tags ? ` [${tags}]` : '';
      sections.push(`  • ${cs.title}${tagStr}: ${cs.outcome}`);
    });
  }

  if (lib.industryPlaybooks.length > 0) {
    sections.push('\nIndustry Playbooks:');
    lib.industryPlaybooks.forEach((pb) => {
      sections.push(`  • ${pb.industry}:`);
      sections.push(`    Pain Points: ${pb.painPoints}`);
      sections.push(`    Messaging: ${pb.messaging}`);
    });
  }

  if (lib.frameworks.length > 0) {
    sections.push('\nSales Frameworks:');
    lib.frameworks.forEach((f) => {
      sections.push(`  • ${f.name}: ${f.summary}`);
    });
  }

  if (lib.events.length > 0) {
    sections.push('\nUpcoming Events (invite prospects):');
    lib.events.forEach((e) => {
      const date = e.date ? ` — ${e.date}` : '';
      const desc = e.description ? `: ${e.description}` : '';
      sections.push(`  • ${e.name}${date}${desc}`);
    });
  }

  return sections.join('\n');
}

function buildRAGBlock(chunks: string[]): string {
  if (chunks.length === 0) return '';
  return `RAG (uploaded file content — use for value propositions and proof points):
${chunks.map((c) => `- ${c}`).join('\n')}`;
}

// ─────────────────────────────────────────────────────────────
// Content Library loader — fetches from DB for a given userId
// ─────────────────────────────────────────────────────────────

/**
 * Load the user's Content Library from the DB for research grounding.
 * Uses ContentLibrary (use cases, case studies, frameworks, CompanyEvent) and IndustryPlaybook.
 */
export async function loadContentLibraryContext(
  userId: string
): Promise<ContentLibraryContext> {
  type ContentRow = { title: string; content: unknown; industry: string | null; department: string | null };
  type PlaybookRow = { name: string; overview: string | null; valuePropsByDepartment: unknown; landmines: unknown };

  const [useCaseRows, caseStudyRows, frameworkRows, industryPlaybooks, eventRows] =
    await Promise.all([
      prisma.contentLibrary.findMany({
        where: { userId, type: ContentType.UseCase, isActive: true },
        select: { title: true, content: true, industry: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }).then((r): ContentRow[] => r.map((x) => ({ ...x, department: null }))).catch(() => []),

      prisma.contentLibrary.findMany({
        where: { userId, type: { in: [ContentType.SuccessStory] } },
        select: { title: true, content: true, industry: true, department: true },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }).catch(() => [] as ContentRow[]),

      prisma.contentLibrary.findMany({
        where: { userId, type: ContentType.Framework },
        select: { title: true, content: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }).then((r) => r.map((x) => ({ title: x.title, content: x.content, industry: null, department: null }))).catch(() => [] as ContentRow[]),

      prisma.industryPlaybook.findMany({
        where: { userId },
        select: { name: true, overview: true, valuePropsByDepartment: true, landmines: true },
        orderBy: { name: 'asc' },
      }).catch(() => [] as PlaybookRow[]),

      prisma.contentLibrary.findMany({
        where: { userId, type: ContentType.CompanyEvent, isActive: true },
        select: { title: true, content: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }).then((r) => r.map((x) => {
        const c = x.content as { date?: string; description?: string } | null;
        return { name: x.title, description: c?.description ?? null, date: c?.date ?? null };
      })).catch(() => []),
    ]);

  const summaryFrom = (content: unknown): string =>
    (content as { summary?: string })?.summary ??
    (content as { description?: string })?.description ??
    '';

  return {
    useCases: useCaseRows.map((u) => ({
      title: u.title,
      summary: summaryFrom(u.content) || u.title,
      industry: u.industry,
    })),
    caseStudies: caseStudyRows.map((c) => ({
      title: c.title,
      outcome: summaryFrom(c.content) || c.title,
      industry: c.industry,
      department: c.department,
    })),
    frameworks: frameworkRows.map((f) => ({
      name: f.title,
      summary: summaryFrom(f.content) || f.title,
    })),
    industryPlaybooks: industryPlaybooks.map((pb) => ({
      industry: pb.name,
      painPoints: Array.isArray(pb.landmines) ? (pb.landmines as string[]).join('; ') : (pb.overview ?? ''),
      messaging: typeof pb.valuePropsByDepartment === 'object' && pb.valuePropsByDepartment
        ? JSON.stringify(pb.valuePropsByDepartment)
        : (pb.overview ?? ''),
    })),
    events: eventRows,
  };
}

// ─────────────────────────────────────────────────────────────
// Research prompt block (for chat + follow-up context)
// ─────────────────────────────────────────────────────────────

/**
 * Build the ACCOUNT RESEARCH prompt block from saved research data.
 * Used by chat and draft-follow-up. Returns null if no research data.
 */
export async function getCompanyResearchPromptBlock(
  companyId: string,
  userId: string
): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    include: {
      departments: {
        where: {
          OR: [
            { useCase: { not: null } },
            { targetRoles: { not: Prisma.JsonNull } },
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
              product: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!company) return null;

  type CompanyWithDepts = typeof company & {
    departments: Array<{
      type: string;
      customName: string | null;
      useCase: string | null;
      valueProp?: string | null;
      objectionHandlers?: unknown;
      proofPoints?: unknown;
      targetRoles: unknown;
      estimatedOpportunity: string | null;
      companyProducts: Array<{ product: { name: string; slug: string } }>;
    }>;
    segmentationStrategy?: string | null;
    segmentationRationale?: string | null;
  };
  const co = company as CompanyWithDepts;

  const hasResearchData =
    co.researchData ||
    co.businessOverview ||
    co.keyInitiatives ||
    co.employees ||
    co.headquarters ||
    co.revenue ||
    (co.departments && co.departments.length > 0);

  if (!hasResearchData) return null;

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'ACCOUNT INTELLIGENCE:',
    `Company: ${co.name}`,
  ];

  if (co.employees || co.headquarters || co.revenue) {
    lines.push('\nCompany Basics:');
    if (co.employees) lines.push(`- Employees: ${co.employees}`);
    if (co.headquarters) lines.push(`- HQ: ${co.headquarters}`);
    if (co.revenue) lines.push(`- Revenue: ${co.revenue}`);
  }

  if (co.businessOverview) {
    lines.push('\nBusiness Overview:');
    lines.push(co.businessOverview);
  }

  if (co.keyInitiatives) {
    const initiatives = co.keyInitiatives as string[] | null;
    if (Array.isArray(initiatives) && initiatives.length > 0) {
      lines.push('\nKey Strategic Initiatives:');
      initiatives.forEach((i) => lines.push(`- ${i}`));
    }
  }

  if (co.segmentationStrategy) {
    lines.push(`\nSegmentation Approach: ${co.segmentationStrategy}`);
  }
  if (co.segmentationRationale) {
    lines.push(`Rationale: ${co.segmentationRationale}`);
  }

  if (co.departments && co.departments.length > 0) {
    lines.push('\nBuying Groups:');
    co.departments.forEach((dept: CompanyWithDepts['departments'][0]) => {
      const name = dept.customName || dept.type.replace(/_/g, ' ');
      lines.push(`\n── ${name} ──`);

      if (dept.valueProp) lines.push(`  Value Proposition: ${dept.valueProp}`);
      if (dept.useCase) lines.push(`  Use Cases: ${dept.useCase}`);
      if (dept.estimatedOpportunity) lines.push(`  Opportunity: ${dept.estimatedOpportunity}`);
      if (dept.proofPoints) lines.push(`  Proof Points: ${JSON.stringify(dept.proofPoints)}`);
      if (dept.objectionHandlers) lines.push(`  Objection Handlers: ${JSON.stringify(dept.objectionHandlers)}`);

      if (dept.targetRoles) {
        const roles = dept.targetRoles as {
          economicBuyer?: string[];
          technicalEvaluator?: string[];
          champion?: string[];
          influencer?: string[];
        } | null;
        if (roles) {
          if (roles.economicBuyer?.length) lines.push(`  Economic Buyer: ${roles.economicBuyer.join(', ')}`);
          if (roles.technicalEvaluator?.length) lines.push(`  Technical Evaluator: ${roles.technicalEvaluator.join(', ')}`);
          if (roles.champion?.length) lines.push(`  Champion: ${roles.champion.join(', ')}`);
          if (roles.influencer?.length) lines.push(`  Influencer: ${roles.influencer.join(', ')}`);
        }
      }

      if (dept.companyProducts?.length) {
        const productNames = dept.companyProducts.map((cp: { product: { name: string } }) => cp.product.name).join(', ');
        lines.push(`  Products: ${productNames}`);
      }
    });
  }

  lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
