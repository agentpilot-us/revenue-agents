'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { researchCompany } from '@/lib/tools/perplexity';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { ProductOwnershipStatus } from '@prisma/client';
import { z } from 'zod';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const fitScoringSchema = z.object({
  opportunities: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      departmentId: z.string(),
      departmentType: z.string(),
      fitScore: z.number().min(0).max(100),
      reasoning: z.string(),
      estimatedARR: z.number(),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      nextSteps: z.array(z.string()),
    })
  ),
});

export type FitOpportunity = z.infer<typeof fitScoringSchema>['opportunities'][number];

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function calculateProductFit(
  companyId: string,
  forceRecalculate: boolean = false
): Promise<FitOpportunity[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const companyCache = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { lastFitCalculation: true, fitCalculationData: true },
  });

  if (!companyCache) {
    throw new Error('Company not found');
  }

  const cacheValid =
    companyCache.lastFitCalculation &&
    Date.now() - new Date(companyCache.lastFitCalculation).getTime() < CACHE_TTL_MS;

  if (!forceRecalculate && cacheValid && companyCache.fitCalculationData != null) {
    console.log('[calculateProductFit] Using cached fit calculation');
    return companyCache.fitCalculationData as FitOpportunity[];
  }

  console.log('[calculateProductFit] Calculating fresh product fit scores...');

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    include: {
      departments: {
        include: {
          contacts: true,
          companyProducts: {
            include: { product: true },
          },
        },
      },
      contacts: true,
    },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const allProducts = await prisma.catalogProduct.findMany({
    orderBy: { name: 'asc' },
  });

  const researchPrompt = `
Research ${company.name}${company.domain ? ` (${company.domain})` : ''} and identify:
1. Recent strategic initiatives (from press releases, earnings calls)
2. Pain points or challenges they're facing
3. Technology investments or focus areas
4. Job postings (what roles are they hiring for?)

Focus on signals that indicate product fit for:
- Autonomous vehicle technology
- Manufacturing/quality control
- Design/CAD collaboration
- AI infrastructure
- Video analytics/security
`.trim();

  const researchResult = await researchCompany({
    query: researchPrompt,
    companyName: company.name,
    companyDomain: company.domain ?? undefined,
  });

  const researchSummary = researchResult.ok
    ? researchResult.summary
    : 'Research unavailable. Proceed with company and product context only.';

  const departmentsContext = company.departments
    .map(
      (d) =>
        `- id=${d.id} type=${d.type} status=${d.status} (${d.customName ?? d.type})
  Contacts: ${d.contacts.length}
  Current products: ${d.companyProducts.filter((cp) => cp.status === 'ACTIVE').map((cp) => cp.product.name).join(', ') || 'None'}`
    )
    .join('\n');

  const productsContext = allProducts
    .map(
      (p) =>
        `- id=${p.id} ${p.name} (${p.slug})
  Price range: $${Number(p.priceMin ?? 0).toLocaleString()} - $${Number(p.priceMax ?? 0).toLocaleString()}
  Target departments: ${p.targetDepartments.join(', ')}
  Use cases: ${p.useCases.join(', ')}`
    )
    .join('\n');

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: fitScoringSchema,
    prompt: `
You are an expert at identifying product expansion opportunities.

COMPANY CONTEXT:
Name: ${company.name}
Industry: ${company.industry ?? 'Unknown'}
Domain: ${company.domain ?? 'Unknown'}

DEPARTMENTS AT THIS COMPANY (use each department's id as departmentId in your output):
${departmentsContext}

RESEARCH FINDINGS:
${researchSummary}

AVAILABLE PRODUCTS TO SELL (use each product's id as productId in your output):
${productsContext}

TASK:
For each department at ${company.name}, identify which products are the best fit.

For each product × department combination:
1. Calculate fit score (0-100) based on:
   - Department relevance (does this dept need this product?)
   - Signals from research (are they investing in this area?)
   - Job postings (are they hiring for this capability?)
   - Pain points (does this product solve their problems?)
   - Existing products (avoid duplicates, but consider upsells)

2. Estimate potential ARR (annual recurring revenue) as a number.

3. Assign priority: HIGH (>80 fit score), MEDIUM (60-80), LOW (<60)

4. Suggest 2-3 concrete next steps for each HIGH opportunity.

IMPORTANT:
- Only include opportunities where fit score >= 60
- If a department already owns the product (ACTIVE), skip it unless it's an upsell
- Focus on departments with status: EXPANSION_TARGET, RESEARCH_PHASE, or NOT_ENGAGED
- Be realistic about fit scores—don't inflate
- For every opportunity you return, departmentId must be one of the department ids listed above, and productId must be one of the product ids listed above.
`.trim(),
  });

  for (const opp of object.opportunities) {
    await prisma.companyProduct.upsert({
      where: {
        companyId_companyDepartmentId_productId: {
          companyId,
          companyDepartmentId: opp.departmentId,
          productId: opp.productId,
        },
      },
      update: {
        status: ProductOwnershipStatus.OPPORTUNITY,
        fitScore: opp.fitScore,
        fitReasoning: opp.reasoning,
        opportunitySize: opp.estimatedARR,
      },
      create: {
        companyId,
        companyDepartmentId: opp.departmentId,
        productId: opp.productId,
        status: ProductOwnershipStatus.OPPORTUNITY,
        fitScore: opp.fitScore,
        fitReasoning: opp.reasoning,
        opportunitySize: opp.estimatedARR,
      },
    });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      lastFitCalculation: new Date(),
      fitCalculationData: object.opportunities,
    },
  });

  return object.opportunities;
}
