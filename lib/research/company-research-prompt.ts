import { prisma } from '@/lib/db';
import { getAccountMessagingPromptBlock } from '@/lib/account-messaging';
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
  /** Rep's targeting intent — prioritize these buying groups, then suggest 2–3 additional. */
  userGoal?: string;
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
${options?.userGoal?.trim() ? `
SALES REP TARGETING GOAL:
${options.userGoal.trim()}

Use this goal to prioritize which buying groups to identify.
Return the groups the rep specified first, then suggest 2–3 additional
groups that fit their product based on the account's structure.
Keep each segment concise: at most 2 use cases and 2 objection handlers per segment.
` : ''}

Given the target company research below, produce the following sections:

1. COMPANY BASICS
   Extract ONLY from the research data provided: companyName, website, industry,
   employees (e.g. "~5,000" or "500–1,000"), headquarters (e.g. "San Francisco, CA"),
   revenue (e.g. "$500M (2024)"). If the research does not state a value, omit the field
   or use "Not disclosed" — never use example numbers from this prompt.

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
// Step 1: Discover buying groups (lightweight, small output)
// ─────────────────────────────────────────────────────────────

export type DiscoverGroupsPromptInput = {
  companyName: string;
  companyDomain?: string;
  productNames: string;
  userGoal?: string;
};

/**
 * Build system + user prompt for Step 1: discover 4–6 buying group names + company basics only.
 * Output is small (DiscoverGroupsResult) so it rarely hits token limits.
 */
export function buildDiscoverGroupsPrompt(input: DiscoverGroupsPromptInput): { system: string; user: string } {
  const { companyName, companyDomain, productNames, userGoal } = input;
  const system = `You are an account intelligence AI. Your task is to analyze research about a target company and output ONLY:
1. COMPANY BASICS: name, website, industry, employees, headquarters, revenue (from the research only; use "Not disclosed" if missing).
2. BUYING GROUPS: 4–6 groups that would buy products like: ${productNames}.

For each buying group provide:
- id: short stable slug (e.g. "av_software", "manufacturing", "it_enterprise"). No spaces.
- name: display name (e.g. "Autonomous Vehicle Software Team", "Manufacturing & Factory Operations").
- rationale: one sentence on why this group matters for buying at this company.
- segmentType: one of FUNCTIONAL (by department), USE_CASE (by use case), DIVISIONAL (by business unit).
- orgFunction: org-chart function (e.g. "Software Engineering", "Manufacturing", "IT").
- divisionOrProduct: if DIVISIONAL or USE_CASE, the division/product line name (e.g. "Autonomous Driving"); otherwise null.

Return exactly the JSON shape requested. No value props, no titles, no products yet.`;

  const userGoalBlock = userGoal?.trim()
    ? `\nSALES REP TARGETING GOAL (prioritize these, then add 2–3 more):\n${userGoal.trim()}\n\n`
    : '';

  const user = `TARGET COMPANY: ${companyName}
${companyDomain ? `Domain: ${companyDomain}` : ''}
${userGoalBlock}RESEARCH DATA (from web search):

{{PERPLEXITY_SUMMARY}}

Extract company basics and 4–6 buying groups. Use segmentType to reflect how this company is organized (functional departments vs use-case teams vs divisions).`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────────
// Step 2: Enrich one buying group (value prop, roles, keywords, seniority)
// ─────────────────────────────────────────────────────────────

export type EnrichGroupPromptInput = {
  companyName: string;
  companyDomain?: string;
  groupName: string;
  rationale: string;
  segmentType: string;
  orgFunction: string;
  divisionOrProduct: string | null;
  catalogProducts: CatalogProduct[];
  contentLibrary?: ContentLibraryContext;
  ragChunks?: string[];
  userGoal?: string;
};

/**
 * Build system + user prompt for enriching a single buying group.
 * Output: BuyingGroupDetail (roles, searchKeywords, seniorityByRole, valueProp, use cases, objections).
 */
export function buildEnrichGroupPrompt(input: EnrichGroupPromptInput): {
  system: string;
  user: string;
} {
  const {
    companyName,
    companyDomain,
    groupName,
    rationale,
    segmentType,
    orgFunction,
    divisionOrProduct,
    catalogProducts,
    contentLibrary,
    ragChunks,
    userGoal,
  } = input;

  const productBlock = buildProductBlock(catalogProducts);
  const contentBlock = contentLibrary ? buildContentLibraryBlock(contentLibrary) : '';
  const ragBlock = ragChunks?.length ? buildRAGBlock(ragChunks) : '';

  const keywordInstruction =
    segmentType === 'USE_CASE' || segmentType === 'DIVISIONAL'
      ? `
For searchKeywords: provide 4–6 terms that would appear in LinkedIn titles or profiles for people in this group (e.g. for Autonomous Vehicles: "autonomous driving", "self-driving", "ADAS", "AV software"). These bridge the gap between the group name and how people actually list their roles.`
      : `
For searchKeywords: leave empty or minimal — titles are sufficient for FUNCTIONAL segments.`;

  const system = `You are an account intelligence AI. Enrich ONE buying group for ${companyName}.

${productBlock}
${contentBlock}
${ragBlock ? `\n${ragBlock}\n` : ''}

OUTPUT SHAPE: One buying group detail with:
- name, segmentType, orgDepartment (Apollo-friendly department label, e.g. "Engineering")
- valueProp: 2–3 sentences for this group at this company. Use our content library when relevant.
- useCasesAtThisCompany: 2–3 concrete use cases (max 2 if rep goal is narrow).
- whyThisGroupBuys: one sentence for contact cards.
- objectionHandlers: 2–3 { objection, response } pairs.
- roles: economicBuyer, technicalEvaluator, champion, influencer — each array at least one searchable LinkedIn title.
- searchKeywords: array of strings for Apollo/LinkedIn search.${keywordInstruction}
- seniorityByRole: for each role type, list Apollo seniority levels used (e.g. ["c_suite", "vp", "director"] for economicBuyer; ["manager", "director"] for technicalEvaluator; ["individual_contributor", "manager"] for champion and influencer).
- products: leave empty (populated in a later step).
- estimatedOpportunity: optional, e.g. "$500K – $2M".

Keep output concise so the response stays within token limits.`;

  const userGoalLine = userGoal?.trim() ? `\nRep goal: ${userGoal.trim()}\n` : '';
  const user = `TARGET COMPANY: ${companyName}
${companyDomain ? `Domain: ${companyDomain}` : ''}
${userGoalLine}
BUYING GROUP TO ENRICH:
- name: ${groupName}
- rationale: ${rationale}
- segmentType: ${segmentType}
- orgFunction: ${orgFunction}
${divisionOrProduct ? `- divisionOrProduct: ${divisionOrProduct}` : ''}

{{PERPLEXITY_SUMMARY}}

Produce the full detail for this one group. Use the research above and our product/content context.`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────────
// Step 3: Product fit scoring (relevance + talkingPoint per product)
// ─────────────────────────────────────────────────────────────

export type ProductFitPromptInput = {
  groupName: string;
  valueProp: string;
  useCasesAtThisCompany: string[];
  whyThisGroupBuys: string;
  productNames: string[];
};

/**
 * Build a short prompt for scoring product fit for one buying group.
 * Output: { products: [{ productName, relevance (0–100), talkingPoint }] }.
 */
export function buildProductFitPrompt(input: ProductFitPromptInput): {
  system: string;
  user: string;
} {
  const { groupName, valueProp, useCasesAtThisCompany, whyThisGroupBuys, productNames } = input;
  const useCasesBlock = useCasesAtThisCompany.map((u) => `- ${u}`).join('\n');
  const productsList = productNames.join(', ');

  const system = `You are an account intelligence AI. Score how relevant each of our products is to ONE buying group. Output a JSON object with a "products" array. Each item: productName (exact from our list), relevance (0–100), talkingPoint (one sentence for contact cards: why this product matters to this group). Include every product from our list; use relevance 0 if not relevant and give a brief talkingPoint anyway.`;

  const user = `BUYING GROUP: ${groupName}
Value prop: ${valueProp}
Why they buy: ${whyThisGroupBuys}
Use cases at this company:
${useCasesBlock}

OUR PRODUCTS (score each): ${productsList}

Return { "products": [ { "productName": "...", "relevance": 0-100, "talkingPoint": "..." }, ... ] }.`;

  return { system, user };
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

  // Include account-level why-this-company messaging so chat/drafts use it
  const accountMessagingBlock = await getAccountMessagingPromptBlock(companyId, userId);
  if (accountMessagingBlock) {
    lines.push('\n');
    lines.push(accountMessagingBlock);
  }

  lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
