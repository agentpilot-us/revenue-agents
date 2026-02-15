import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';

type CatalogProduct = {
  name: string;
  slug: string;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  targetDepartments: string[] | null;
};

/**
 * Build the system prompt for Claude to structure company research data.
 * Provides context about catalog products and research guidelines.
 */
export function buildCompanyResearchPrompt(catalogProducts: CatalogProduct[]): string {
  const productList = catalogProducts
    .map(
      (p) =>
        `- ${p.name} (slug: ${p.slug}): ${p.description || 'No description'}
  Price: ${p.priceMin ? `$${p.priceMin.toLocaleString()}` : '—'} - ${p.priceMax ? `$${p.priceMax.toLocaleString()}` : '—'}
  Target Departments: ${p.targetDepartments?.join(', ') || 'Various'}`
    )
    .join('\n');

  const departmentTypes = Object.values(DepartmentType).join(', ');

  return `You are an AI assistant helping structure company research data for B2B sales.

AVAILABLE PRODUCTS (catalog):
${productList}

DEPARTMENT TYPES (use exact enum values when matching):
${departmentTypes}

RESEARCH GUIDELINES:
1. Company Basics: Extract official name, website, industry, employee count (as string like "~167,000"), headquarters location, and annual revenue (as string like "$171.8B (2024)")

2. Business Overview: Provide a 2-3 sentence summary of what the company does. Extract key strategic initiatives as specific, actionable items (e.g., "$35B investment in EVs through 2025").

3. Product Fit: For each relevant product:
   - Match product names exactly to CatalogProduct names above
   - Provide specific use case at this company (not generic)
   - Explain why this product matters for them specifically

4. Micro-Segments: Identify departments/divisions that would use these products:
   - Use DepartmentType enum when there's a clear match (e.g., AUTONOMOUS_VEHICLES, MANUFACTURING_OPERATIONS)
   - Provide custom name if no enum matches
   - Include specific use case for each segment
   - Link products using product slugs (must match CatalogProduct slugs)
   - Provide estimated opportunity size as string (e.g., "$500K - $2M")
   - Identify target roles with specific job titles for LinkedIn search:
     * Economic Buyer: Budget owners (VP, C-suite titles)
     * Technical Evaluator: Technical decision makers (Director, Manager titles)
     * Champion: Internal advocates (Senior Engineer, Tech Lead titles)
     * Influencer: Day-to-day users (Engineer, Developer titles)

5. Role Titles: Use specific, searchable job titles (e.g., "VP Engineering", "Director ML", "Senior ML Engineer", "ML Engineer") that can be used for LinkedIn contact discovery.

Be specific and accurate. All product names and slugs must match the catalog above.`;
}

/**
 * Build the ACCOUNT RESEARCH prompt block from AI research data for a company.
 * Returns null if no research data exists. Used by chat and draft-follow-up
 * to provide rich company context for messaging and contact discovery.
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
            { targetRoles: { not: null } },
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
              product: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!company) return null;

  // Check if we have any research data
  const hasResearchData =
    company.researchData ||
    company.businessOverview ||
    company.keyInitiatives ||
    company.employees ||
    company.headquarters ||
    company.revenue ||
    (company.departments && company.departments.length > 0);

  if (!hasResearchData) return null;

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'ACCOUNT RESEARCH (AI-Generated Intelligence):',
    `Company: ${company.name}`,
  ];

  // Company Basics
  if (company.employees || company.headquarters || company.revenue) {
    lines.push('\nCompany Basics:');
    if (company.employees) lines.push(`- Employees: ${company.employees}`);
    if (company.headquarters) lines.push(`- Headquarters: ${company.headquarters}`);
    if (company.revenue) lines.push(`- Revenue: ${company.revenue}`);
  }

  // Business Overview
  if (company.businessOverview) {
    lines.push('\nBusiness Overview:');
    lines.push(company.businessOverview);
  }

  // Key Initiatives
  if (company.keyInitiatives) {
    const initiatives = company.keyInitiatives as string[] | null;
    if (Array.isArray(initiatives) && initiatives.length > 0) {
      lines.push('\nKey Strategic Initiatives:');
      initiatives.forEach((initiative) => lines.push(`- ${initiative}`));
    }
  }

  // Micro-Segments (Departments with research data)
  if (company.departments && company.departments.length > 0) {
    lines.push('\nMicro-Segments (Departments/Divisions):');
    company.departments.forEach((dept) => {
      const deptName = dept.customName || dept.type.replace(/_/g, ' ');
      lines.push(`\n${deptName}:`);
      
      if (dept.useCase) {
        lines.push(`  Use Case: ${dept.useCase}`);
      }
      
      if (dept.estimatedOpportunity) {
        lines.push(`  Estimated Opportunity: ${dept.estimatedOpportunity}`);
      }
      
      // Target Roles for Contact Discovery
      if (dept.targetRoles) {
        const roles = dept.targetRoles as {
          economicBuyer?: string[];
          technicalEvaluator?: string[];
          champion?: string[];
          influencer?: string[];
        } | null;
        
        if (roles) {
          if (roles.economicBuyer && roles.economicBuyer.length > 0) {
            lines.push(`  Economic Buyer Roles: ${roles.economicBuyer.join(', ')}`);
          }
          if (roles.technicalEvaluator && roles.technicalEvaluator.length > 0) {
            lines.push(`  Technical Evaluator Roles: ${roles.technicalEvaluator.join(', ')}`);
          }
          if (roles.champion && roles.champion.length > 0) {
            lines.push(`  Champion Roles: ${roles.champion.join(', ')}`);
          }
          if (roles.influencer && roles.influencer.length > 0) {
            lines.push(`  Influencer Roles: ${roles.influencer.join(', ')}`);
          }
        }
      }
      
      // Products linked to this department
      if (dept.companyProducts && dept.companyProducts.length > 0) {
        const productNames = dept.companyProducts
          .map((cp) => cp.product.name)
          .join(', ');
        lines.push(`  Products: ${productNames}`);
      }
    });
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}
