import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';
import { researchCompany } from '@/lib/tools/perplexity';
import { prisma } from '@/lib/db';
import {
  buyingGroupDetailSchema,
  companyResearchSchema,
  discoverGroupsResultSchema,
  productFitListSchema,
  type BuyingGroupDetail,
  type BuyingGroupSeed,
  type CompanyResearchData,
  type DiscoverGroupsResult,
  type ProductFit,
} from './company-research-schema';
import {
  buildCompanyResearchPrompt,
  buildDiscoverGroupsPrompt,
  buildEnrichGroupPrompt,
  buildProductFitPrompt,
  loadContentLibraryContext,
} from './company-research-prompt';
import {
  findRelevantContentLibraryChunks,
  getAllContentLibraryChunkContents,
} from '@/lib/content-library-rag';
import type { DealContext } from '@/lib/types/deal-context';

export type ResearchCompanyResult =
  | { ok: true; data: CompanyResearchData }
  | { ok: false; error: string };

export type PerplexityOnlyResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

/**
 * Run only the Perplexity (web search) step. Use with structureResearchWithClaude for two-phase research with UI status.
 * When dealContext is provided, research query is adjusted for stalled/champion_in/existing_deployed.
 */
export async function runPerplexityResearchOnly(
  companyName: string,
  companyDomain: string | undefined,
  userId: string,
  userGoal?: string,
  dealContext?: DealContext
): Promise<PerplexityOnlyResult> {
  if (!userId) {
    return {
      ok: false,
      error:
        'Complete your company setup (Content Library) with your company name and website before running research.',
    };
  }

  const [user, contentLibrary] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { companyName: true, companyWebsite: true },
    }),
    loadContentLibraryContext(userId).catch(() => null),
  ]);

  const userCompanyName = user?.companyName?.trim() ?? null;
  if (!userCompanyName) {
    return {
      ok: false,
      error:
        'Complete your company setup (Content Library) with your company name and website before running research.',
    };
  }

  let catalogProducts = await prisma.catalogProduct.findMany({
    where: { userId } as { userId: string },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      priceMin: true,
      priceMax: true,
      targetDepartments: true,
    },
    orderBy: { name: 'asc' },
  });

  if (dealContext?.productIds?.length) {
    catalogProducts = catalogProducts.filter((p) => dealContext!.productIds!.includes(p.id));
  }

  let contentLibraryProductsFirst: { name: string; description: string | null }[] = [];
  if (catalogProducts.length === 0) {
    contentLibraryProductsFirst = await prisma.product.findMany({
      where: { userId },
      select: { name: true, description: true },
      orderBy: { name: 'asc' },
    });
    if (dealContext?.productNames?.length) {
      const namesSet = new Set(dealContext.productNames.map((n) => n.trim()).filter(Boolean));
      contentLibraryProductsFirst = contentLibraryProductsFirst.filter((p) => namesSet.has(p.name));
    }
  }

  const productNamesForQuery =
    catalogProducts.length > 0
      ? catalogProducts.map((p) => p.name).join(', ')
      : contentLibraryProductsFirst.map((p) => p.name).join(', ');

  if (productNamesForQuery.length === 0) {
    return {
      ok: false,
      error:
        'No products found. Add products in Your company data (Products) or set up catalog products first.',
    };
  }

  const productNames = productNamesForQuery;
  let researchQuery: string;

  const status = dealContext?.accountStatus;
  if (status === 'stalled') {
    researchQuery = `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''}: focus on what changed in the last 90 days — executive changes, new initiatives, funding, product launches, reorgs. Identify re-entry points and new stakeholders. Also include company basics: website, industry, employee count, headquarters, revenue. Relevant buying areas: ${productNames}.`;
  } else if (status === 'champion_in') {
    researchQuery = `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''}: focus on approval chain, committee structure, and decision-makers above the champion. Who is the economic buyer? Who sits on buying committees? Also include company basics and organizational structure. Relevant products: ${productNames}.`;
  } else if (status === 'existing_deployed') {
    const loc = dealContext?.deployedLocation?.trim() || 'one team';
    researchQuery = `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''}: we are already deployed at ${loc}. Focus on OTHER divisions, departments, or business units that could expand the footprint — adjacent use cases, other geographies, other product lines. Do not re-research the already-deployed area. Include company basics and full organizational structure. Relevant products: ${productNames}.`;
  } else if (userGoal?.trim()) {
    researchQuery = `${companyName} organization structure, departments relevant to: ${userGoal.trim()}. Include headcount, key initiatives, and leadership for those teams. Also include company basics: website, industry, employee count, headquarters, revenue.`;
  } else {
    researchQuery = `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''} and provide:

1. COMPANY BASICS: official name, website, industry, employee count, headquarters, annual revenue

2. BUSINESS OVERVIEW: what they do, their core business model, primary markets

3. STRATEGIC PRIORITIES: recent announcements, earnings call themes, job postings that reveal where they are investing (especially in technology, operations, or go-to-market)

4. ORGANIZATIONAL STRUCTURE: how is the company organized? By function, division, product line, or geography? Name the key departments and business units.

5. TECHNOLOGY & BUYING SIGNALS: what tools, platforms, or vendors do they currently use? Any recent tech evaluations, RFPs, or vendor changes mentioned publicly?

6. BUYING GROUPS: which departments or teams at ${companyName} make decisions about B2B software purchases in areas like: ${productNames}? What are their priorities and what titles do the decision-makers hold?

Focus on finding specific, actionable intelligence that would help a B2B sales rep engage the right people at ${companyName} with relevant messaging.`;
  }

  const perplexityResult = await researchCompany({
    query: researchQuery,
    companyName,
    companyDomain,
  });

  if (!perplexityResult.ok) {
    return { ok: false, error: perplexityResult.error };
  }

  return { ok: true, summary: perplexityResult.summary };
}

export type DiscoverBuyingGroupsResult =
  | { ok: true; data: DiscoverGroupsResult; perplexitySummary: string }
  | { ok: false; error: string };

/**
 * Step 1 of 4-step account intel: Perplexity + small LLM output (company basics + 4–6 buying group seeds).
 * When dealContext is provided, products are filtered by dealContext.productIds and prompt includes deal-context blocks.
 */
export async function discoverBuyingGroupsForAccount(
  companyName: string,
  companyDomain: string | undefined,
  userId: string,
  userGoal?: string,
  dealContext?: DealContext
): Promise<DiscoverBuyingGroupsResult> {
  const perplexityResult = await runPerplexityResearchOnly(
    companyName,
    companyDomain,
    userId,
    userGoal,
    dealContext
  );
  if (!perplexityResult.ok) return { ok: false, error: perplexityResult.error };

  let catalogProducts = await prisma.catalogProduct.findMany({
    where: { userId } as { userId: string },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  if (dealContext?.productIds?.length) {
    catalogProducts = catalogProducts.filter((p) => dealContext!.productIds!.includes(p.id));
  }
  let contentLibraryProducts: { name: string }[] = [];
  if (catalogProducts.length === 0) {
    contentLibraryProducts = await prisma.product.findMany({
      where: { userId },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    if (dealContext?.productNames?.length) {
      const namesSet = new Set(dealContext.productNames.map((n) => n.trim()).filter(Boolean));
      contentLibraryProducts = contentLibraryProducts.filter((p) => namesSet.has(p.name));
    }
  }
  const productNames =
    catalogProducts.length > 0
      ? catalogProducts.map((p) => p.name).join(', ')
      : contentLibraryProducts.map((p) => p.name).join(', ');
  if (!productNames) {
    return {
      ok: false,
      error:
        'No products found. Add products in Your company data or set up catalog products first.',
    };
  }

  if (
    process.env.USE_MOCK_LLM !== 'true' &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    return {
      ok: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY required for discovery.',
    };
  }

  const { system, user: userTemplate } = buildDiscoverGroupsPrompt({
    companyName,
    companyDomain,
    productNames,
    userGoal: userGoal?.trim() || undefined,
    dealContext,
  });
  const userPrompt = userTemplate.replace(
    '{{PERPLEXITY_SUMMARY}}',
    perplexityResult.summary
  );

  try {
    const result = await generateObject({
      model: getChatModel(),
      schema: discoverGroupsResultSchema,
      system,
      prompt: userPrompt,
      maxOutputTokens: 2500,
    });
    const parsed = discoverGroupsResultSchema.safeParse(result.object);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const path = first?.path?.join('.') ?? 'field';
      console.error('Discover groups schema validation failed:', parsed.error.flatten());
      return {
        ok: false,
        error: `Invalid structure (${path}): ${first?.message ?? 'check format'}. Try again.`,
      };
    }
    return { ok: true, data: parsed.data, perplexitySummary: perplexityResult.summary };
  } catch (err) {
    console.error('discoverBuyingGroupsForAccount error:', err);
    if (err instanceof Error) {
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        return { ok: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Discovery failed unexpectedly.' };
  }
}

export type EnrichGroupResult =
  | { ok: true; data: BuyingGroupDetail }
  | { ok: false; error: string };

/**
 * Step 2 of 4-step account intel: Enrich one buying group (value prop, roles, searchKeywords, seniorityByRole).
 * Caller supplies the Perplexity summary so the group-enrich API can run Perplexity once and then N enrichments in parallel.
 */
export async function enrichBuyingGroup(
  companyName: string,
  companyDomain: string | undefined,
  seed: BuyingGroupSeed,
  userId: string,
  perplexitySummary: string,
  userGoal?: string
): Promise<EnrichGroupResult> {
  const catalogProductsStruct = await prisma.catalogProduct.findMany({
    where: { userId } as { userId: string },
    select: {
      name: true,
      slug: true,
      description: true,
      priceMin: true,
      priceMax: true,
      targetDepartments: true,
    },
    orderBy: { name: 'asc' },
  });

  const contentLibraryProductsStruct =
    catalogProductsStruct.length === 0
      ? await prisma.product.findMany({
          where: { userId },
          select: { name: true, description: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const catalogForPrompt =
    catalogProductsStruct.length > 0
      ? catalogProductsStruct.map((p) => ({
          name: p.name,
          slug: p.slug,
          description: p.description,
          priceMin: p.priceMin != null ? Number(p.priceMin) : null,
          priceMax: p.priceMax != null ? Number(p.priceMax) : null,
          targetDepartments: (p.targetDepartments as string[] | null) ?? null,
        }))
      : contentLibraryProductsStruct.map((p) => ({
          name: p.name,
          slug: p.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product',
          description: p.description,
          priceMin: null as number | null,
          priceMax: null as number | null,
          targetDepartments: [] as string[] | null,
        }));

  if (catalogForPrompt.length === 0) {
    return {
      ok: false,
      error: 'No products found. Add products or catalog products first.',
    };
  }

  const contentLibrary = await loadContentLibraryContext(userId).catch(() => null);
  const ragProductNames = catalogForPrompt.map((p) => p.name).join(' ');
  const ragQuery = `${companyName} ${seed.name} ${ragProductNames} value prop use cases`;
  const [relevantChunks, allChunks] = await Promise.all([
    findRelevantContentLibraryChunks(userId, ragQuery, 4),
    getAllContentLibraryChunkContents(userId, 3),
  ]);
  const seen = new Set<string>();
  const ragChunks: string[] = [];
  for (const c of [...relevantChunks, ...allChunks]) {
    const key = c.slice(0, 200);
    if (!seen.has(key)) {
      seen.add(key);
      ragChunks.push(c);
    }
  }

  const { system, user: userTemplate } = buildEnrichGroupPrompt({
    companyName,
    companyDomain,
    groupName: seed.name,
    rationale: seed.rationale,
    segmentType: seed.segmentType,
    orgFunction: seed.orgFunction,
    divisionOrProduct: seed.divisionOrProduct ?? null,
    catalogProducts: catalogForPrompt,
    contentLibrary: contentLibrary ?? undefined,
    ragChunks: ragChunks.length > 0 ? ragChunks : undefined,
    userGoal: userGoal?.trim() || undefined,
  });
  const userPrompt = userTemplate.replace(
    '{{PERPLEXITY_SUMMARY}}',
    perplexitySummary
  );

  if (
    process.env.USE_MOCK_LLM !== 'true' &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    return {
      ok: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY required for enrichment.',
    };
  }

  try {
    const result = await generateObject({
      model: getChatModel(),
      schema: buyingGroupDetailSchema,
      system,
      prompt: userPrompt,
      maxOutputTokens: 2500,
    });
    const parsed = buyingGroupDetailSchema.safeParse(result.object);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const path = first?.path?.join('.') ?? 'field';
      console.error('Enrich group schema validation failed:', parsed.error.flatten());
      return {
        ok: false,
        error: `Invalid structure (${path}): ${first?.message ?? 'check format'}. Try again.`,
      };
    }
    return { ok: true, data: parsed.data };
  } catch (err) {
    console.error('enrichBuyingGroup error:', err);
    if (err instanceof Error) {
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        return { ok: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Enrichment failed unexpectedly.' };
  }
}

export type ProductFitForGroupResult =
  | { ok: true; products: ProductFit[] }
  | { ok: false; error: string };

/**
 * Step 3 of 4-step account intel: Score each catalog product for one buying group (relevance 0–100 + talkingPoint).
 */
export async function scoreProductFitForGroup(
  group: BuyingGroupDetail,
  productNames: string[]
): Promise<ProductFitForGroupResult> {
  if (productNames.length === 0) {
    return { ok: true, products: [] };
  }
  if (
    process.env.USE_MOCK_LLM !== 'true' &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    return {
      ok: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY required for product fit.',
    };
  }

  const { system, user } = buildProductFitPrompt({
    groupName: group.name,
    valueProp: group.valueProp,
    useCasesAtThisCompany: group.useCasesAtThisCompany,
    whyThisGroupBuys: group.whyThisGroupBuys,
    productNames,
  });

  try {
    const result = await generateObject({
      model: getChatModel(),
      schema: productFitListSchema,
      system,
      prompt: user,
      maxOutputTokens: 1500,
    });
    const parsed = productFitListSchema.safeParse(result.object);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const path = first?.path?.join('.') ?? 'field';
      console.error('Product fit schema validation failed:', parsed.error.flatten());
      return {
        ok: false,
        error: `Invalid structure (${path}): ${first?.message ?? 'check format'}. Try again.`,
      };
    }
    return { ok: true, products: parsed.data.products };
  } catch (err) {
    console.error('scoreProductFitForGroup error:', err);
    if (err instanceof Error) {
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        return { ok: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Product fit scoring failed unexpectedly.' };
  }
}

/**
 * Run only the LLM structuring step using a pre-fetched Perplexity summary. Use after runPerplexityResearchOnly for two-phase research with UI status.
 */
export async function structureResearchWithClaude(
  companyName: string,
  companyDomain: string | undefined,
  perplexitySummary: string,
  userId: string,
  userGoal?: string
): Promise<ResearchCompanyResult> {
  try {
    if (!userId) {
      return {
        ok: false,
        error:
          'Complete your company setup (Content Library) with your company name and website before running research.',
      };
    }

    const [user, contentLibrary] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { companyName: true, companyWebsite: true },
      }),
      loadContentLibraryContext(userId).catch(() => null),
    ]);

    const userCompanyName = user?.companyName?.trim() ?? null;
    const userCompanyWebsite = user?.companyWebsite?.trim() ?? null;

    if (!userCompanyName) {
      return {
        ok: false,
        error:
          'Complete your company setup (Content Library) with your company name and website before running research.',
      };
    }

    const catalogProductsStruct = await prisma.catalogProduct.findMany({
      where: { userId } as { userId: string },
      select: {
        name: true,
        slug: true,
        description: true,
        priceMin: true,
        priceMax: true,
        targetDepartments: true,
      },
      orderBy: { name: 'asc' },
    });

    const contentLibraryProductsStruct =
      catalogProductsStruct.length === 0
        ? await prisma.product.findMany({
            where: { userId },
            select: { name: true, description: true },
            orderBy: { name: 'asc' },
          })
        : [];

    const catalogForPrompt =
      catalogProductsStruct.length > 0
        ? catalogProductsStruct.map((p) => ({
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceMin: p.priceMin != null ? Number(p.priceMin) : null,
            priceMax: p.priceMax != null ? Number(p.priceMax) : null,
            targetDepartments: p.targetDepartments as string[] | null,
          }))
        : contentLibraryProductsStruct.map((p) => ({
            name: p.name,
            slug: p.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product',
            description: p.description,
            priceMin: null as number | null,
            priceMax: null as number | null,
            targetDepartments: [] as string[] | null,
          }));

    if (catalogForPrompt.length === 0) {
      return {
        ok: false,
        error:
          'No products found. Add products in Your company data (Products) or set up catalog products first.',
      };
    }

    const sellerDescription = process.env.SELLER_COMPANY_DESCRIPTION ?? null;

    const ragProductNames = catalogForPrompt.map((p) => p.name).join(' ');
    const ragQuery = `${companyName} ${ragProductNames} value proposition use cases proof`;
    const [relevantChunks, allChunks] = await Promise.all([
      findRelevantContentLibraryChunks(userId, ragQuery, 6),
      getAllContentLibraryChunkContents(userId, 5),
    ]);
    const seen = new Set<string>();
    const ragChunks: string[] = [];
    for (const c of [...relevantChunks, ...allChunks]) {
      const key = c.slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        ragChunks.push(c);
      }
    }

    const systemPrompt = buildCompanyResearchPrompt(catalogForPrompt, {
      sellerCompanyName: userCompanyName,
      sellerWebsite: userCompanyWebsite ?? undefined,
      sellerDescription: sellerDescription ?? undefined,
      contentLibrary: contentLibrary ?? undefined,
      ragChunks: ragChunks.length > 0 ? ragChunks : undefined,
      userGoal: userGoal?.trim() || undefined,
    });

    if (
      process.env.USE_MOCK_LLM !== 'true' &&
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      return {
        ok: false,
        error: 'GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY required for synthesis.',
      };
    }

    const hasContentLibrary =
      contentLibrary &&
      (contentLibrary.useCases.length > 0 ||
        contentLibrary.caseStudies.length > 0 ||
        contentLibrary.industryPlaybooks.length > 0);

    const contentLibraryNote = hasContentLibrary
      ? `\nIMPORTANT: Use the Content Library entries above to ground your value propositions and proof points. Reference specific use cases, case studies, or industry playbooks by name where they are relevant to this account.`
      : `\nNOTE: No Content Library entries are available yet. Generate value propositions based on the product catalog and what you know about the target company's priorities.`;

    const userGoalBlock =
      userGoal?.trim() ?
        `\nSALES REP TARGETING GOAL (prioritize these groups, then suggest 2–3 more):\n${userGoal.trim()}\n\n`
      : '';

    const userPrompt = `TARGET COMPANY: ${companyName}
${companyDomain ? `Domain: ${companyDomain}` : ''}
${userGoalBlock}
RESEARCH DATA (from web search):
${perplexitySummary}

${contentLibraryNote}

CRITICAL: COMPANY BASICS (employees, headquarters, revenue) must be taken ONLY from the RESEARCH DATA above for ${companyName}. Do not use example numbers, placeholders from the schema, or any other company's data. If the research does not state a value, omit that field or use "Not disclosed".

Now produce the full account intelligence brief per the schema. For each micro-segment:
- Write a value proposition that references ${companyName}'s specific context and initiatives
- List 2–3 concrete use cases (useCasesAtThisCompany) showing HOW they would use our products
- Include proof points from our Content Library if available
- Provide objection handlers (objection + response pairs) specific to this type of buyer
- List searchable LinkedIn job titles for each role category (economicBuyer, technicalEvaluator, champion, influencer) — at least one title per category
- Set segmentationStrategy and segmentationRationale based on how this company is organized

You MUST output at least one micro-segment. Do not return an empty microSegments array.`;

    const runGenerateObjectWithRetry = async () => {
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          return await generateObject({
            model: getChatModel(),
            schema: companyResearchSchema,
            system: systemPrompt,
            maxOutputTokens: 8000,
            prompt: userPrompt,
          });
        } catch (err) {
          lastError = err;
          const message = err instanceof Error ? err.message : '';
          const isParseError =
            typeof message === 'string' &&
            (message.includes('No object generated') ||
              message.includes('could not parse the response'));
          if (attempt === 1 && isParseError) {
            console.warn(
              'generateObject parse error (structure research), retrying once…',
              err
            );
            continue;
          }
          break;
        }
      }
      if (lastError instanceof Error) {
        throw lastError;
      }
      throw new Error('Research failed while structuring account intelligence.');
    };

    const result = await runGenerateObjectWithRetry();

    const object = result.object;
    const parsed = companyResearchSchema.safeParse(object);

    if (!parsed.success) {
      const firstIssue = parsed.error.errors[0];
      const path = firstIssue?.path?.join('.') ?? 'field';
      console.error('Research schema validation failed:', parsed.error.flatten());
      return {
        ok: false,
        error: `Research structure invalid (${path}): ${firstIssue?.message ?? 'check format'}. Try again.`,
      };
    }

    return { ok: true, data: parsed.data };
  } catch (generateError) {
    console.error('structureResearchWithClaude error:', generateError);

    if (generateError instanceof z.ZodError) {
      const msg = generateError.errors[0]?.message ?? 'Invalid structure';
      return { ok: false, error: `Validation: ${msg}` };
    }

    if (generateError instanceof Error) {
      if (generateError.message.includes('schema') || generateError.message.includes('validation')) {
        return { ok: false, error: `Structure error: ${generateError.message}` };
      }
      if (
        generateError.message.includes('API') ||
        generateError.message.includes('key') ||
        generateError.message.includes('401') ||
        generateError.message.includes('403')
      ) {
        return { ok: false, error: `API error: ${generateError.message}` };
      }
      if (generateError.message.includes('429') || generateError.message.includes('rate limit')) {
        return { ok: false, error: 'Rate limit exceeded. Please try again in a moment.' };
      }
      if (generateError.message.includes('timeout') || generateError.message.includes('Timeout')) {
        return { ok: false, error: 'Research timed out. Please try again.' };
      }
      return { ok: false, error: generateError.message };
    }

    return { ok: false, error: 'Research failed unexpectedly.' };
  }
}

/**
 * Research a target company and return structured account intelligence.
 *
 * Pipeline:
 * 1. Load seller's Content Library (use cases, case studies, events, etc.) when userId provided
 * 2. Load catalog products
 * 3. Research target company via Perplexity (web search)
 * 4. Synthesize via LLM: map target → buying segments → value props, use cases, objection handlers, roles
 *
 * Output includes per-segment value propositions, use cases, proof points, objection handlers,
 * and searchable contact titles — grounded in the seller's Content Library when available.
 */
export async function researchCompanyForAccount(
  companyName: string,
  companyDomain?: string,
  userId?: string
): Promise<ResearchCompanyResult> {
  try {
    // Research requires company setup (Content Library): userId and company name are required
    if (!userId) {
      return {
        ok: false,
        error:
          'Complete your company setup (Content Library) with your company name and website before running research.',
      };
    }

    const [user, contentLibrary] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { companyName: true, companyWebsite: true },
      }),
      loadContentLibraryContext(userId).catch(() => null),
    ]);

    const userCompanyName = user?.companyName?.trim() ?? null;
    const userCompanyWebsite = user?.companyWebsite?.trim() ?? null;

    if (!userCompanyName) {
      return {
        ok: false,
        error:
          'Complete your company setup (Content Library) with your company name and website before running research.',
      };
    }

    // Step 2: Load catalog products, or fall back to Content Library Products (Your company data → Products)
    const catalogProducts = await prisma.catalogProduct.findMany({
      where: { userId } as { userId: string },
      select: {
        name: true,
        slug: true,
        description: true,
        priceMin: true,
        priceMax: true,
        targetDepartments: true,
      },
      orderBy: { name: 'asc' },
    });

    const contentLibraryProducts =
      catalogProducts.length === 0
        ? await prisma.product.findMany({
            where: { userId },
            select: { name: true, description: true },
            orderBy: { name: 'asc' },
          })
        : [];

    const productsForResearch =
      catalogProducts.length > 0
        ? catalogProducts.map((p) => ({
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceMin: p.priceMin != null ? Number(p.priceMin) : null,
            priceMax: p.priceMax != null ? Number(p.priceMax) : null,
            targetDepartments: p.targetDepartments as string[] | null,
          }))
        : contentLibraryProducts.map((p) => ({
            name: p.name,
            slug: p.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product',
            description: p.description,
            priceMin: null as number | null,
            priceMax: null as number | null,
            targetDepartments: [] as string[] | null,
          }));

    if (productsForResearch.length === 0) {
      return {
        ok: false,
        error:
          'No products found. Add products in Your company data (Products) or set up catalog products first.',
      };
    }

    // Step 3: Research target company via Perplexity
    const productNames = productsForResearch.map((p) => p.name).join(', ');

    const researchQuery = `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''} and provide:

1. COMPANY BASICS: official name, website, industry, employee count, headquarters, annual revenue

2. BUSINESS OVERVIEW: what they do, their core business model, primary markets

3. STRATEGIC PRIORITIES: recent announcements, earnings call themes, job postings that reveal where they are investing (especially in technology, operations, or go-to-market)

4. ORGANIZATIONAL STRUCTURE: how is the company organized? By function, division, product line, or geography? Name the key departments and business units.

5. TECHNOLOGY & BUYING SIGNALS: what tools, platforms, or vendors do they currently use? Any recent tech evaluations, RFPs, or vendor changes mentioned publicly?

6. BUYING GROUPS: which departments or teams at ${companyName} make decisions about B2B software purchases in areas like: ${productNames}? What are their priorities and what titles do the decision-makers hold?

Focus on finding specific, actionable intelligence that would help a B2B sales rep engage the right people at ${companyName} with relevant messaging.`;

    const perplexityResult = await researchCompany({
      query: researchQuery,
      companyName,
      companyDomain,
    });

    if (!perplexityResult.ok) {
      return { ok: false, error: perplexityResult.error };
    }

    // Step 4: Synthesize with LLM (new schema: value props, use cases, objection handlers per segment)
    const catalogForPrompt = productsForResearch;

    // Company name/website come from company setup only (required above)
    const sellerDescription =
      process.env.SELLER_COMPANY_DESCRIPTION ?? null;

    // RAG: relevant chunks + full set so agent has access to all uploaded file data
    const ragProductNames = productsForResearch.map((p) => p.name).join(' ');
    const ragQuery = `${companyName} ${ragProductNames} value proposition use cases proof`;
    const [relevantChunks, allChunks] = await Promise.all([
      findRelevantContentLibraryChunks(userId, ragQuery, 6),
      getAllContentLibraryChunkContents(userId, 5),
    ]);
    const seen = new Set<string>();
    const ragChunks: string[] = [];
    for (const c of [...relevantChunks, ...allChunks]) {
      const key = c.slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        ragChunks.push(c);
      }
    }

    const systemPrompt = buildCompanyResearchPrompt(catalogForPrompt, {
      sellerCompanyName: userCompanyName,
      sellerWebsite: userCompanyWebsite ?? undefined,
      sellerDescription: sellerDescription ?? undefined,
      contentLibrary: contentLibrary ?? undefined,
      ragChunks: ragChunks.length > 0 ? ragChunks : undefined,
    });

    if (
      process.env.USE_MOCK_LLM !== 'true' &&
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      return {
        ok: false,
        error: 'GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY required for synthesis.',
      };
    }

    const hasContentLibrary =
      contentLibrary &&
      (contentLibrary.useCases.length > 0 ||
        contentLibrary.caseStudies.length > 0 ||
        contentLibrary.industryPlaybooks.length > 0);

    const contentLibraryNote = hasContentLibrary
      ? `\nIMPORTANT: Use the Content Library entries above to ground your value propositions and proof points. Reference specific use cases, case studies, or industry playbooks by name where they are relevant to this account.`
      : `\nNOTE: No Content Library entries are available yet. Generate value propositions based on the product catalog and what you know about the target company's priorities.`;

    const userPrompt = `TARGET COMPANY: ${companyName}
${companyDomain ? `Domain: ${companyDomain}` : ''}

RESEARCH DATA (from web search):
${perplexityResult.summary}

${contentLibraryNote}

CRITICAL: COMPANY BASICS (employees, headquarters, revenue) must be taken ONLY from the RESEARCH DATA above for ${companyName}. Do not use example numbers, placeholders from the schema, or any other company's data. If the research does not state a value, omit that field or use "Not disclosed".

Now produce the full account intelligence brief per the schema. For each micro-segment:
- Write a value proposition that references ${companyName}'s specific context and initiatives
- List 2–3 concrete use cases (useCasesAtThisCompany) showing HOW they would use our products
- Include proof points from our Content Library if available
- Provide objection handlers (objection + response pairs) specific to this type of buyer
- List searchable LinkedIn job titles for each role category (economicBuyer, technicalEvaluator, champion, influencer) — at least one title per category
- Set segmentationStrategy and segmentationRationale based on how this company is organized

You MUST output at least one micro-segment. Do not return an empty microSegments array.`;

    try {
      const result = await generateObject({
        model: getChatModel(),
        schema: companyResearchSchema,
        system: systemPrompt,
        maxOutputTokens: 8000,
        prompt: userPrompt,
      });

      const object = result.object;
      const parsed = companyResearchSchema.safeParse(object);

      if (!parsed.success) {
        const firstIssue = parsed.error.errors[0];
        const path = firstIssue?.path?.join('.') ?? 'field';
        console.error('Research schema validation failed:', parsed.error.flatten());
        return {
          ok: false,
          error: `Research structure invalid (${path}): ${firstIssue?.message ?? 'check format'}. Try again.`,
        };
      }

      return { ok: true, data: parsed.data };
    } catch (generateError) {
      console.error('Research LLM error:', generateError);

      if (generateError instanceof z.ZodError) {
        const msg = generateError.errors[0]?.message ?? 'Invalid structure';
        return { ok: false, error: `Validation: ${msg}` };
      }

      if (generateError instanceof Error) {
        if (generateError.message.includes('schema') || generateError.message.includes('validation')) {
          return { ok: false, error: `Structure error: ${generateError.message}` };
        }
        if (
          generateError.message.includes('API') ||
          generateError.message.includes('key') ||
          generateError.message.includes('401') ||
          generateError.message.includes('403')
        ) {
          return { ok: false, error: `API error: ${generateError.message}` };
        }
        if (generateError.message.includes('429') || generateError.message.includes('rate limit')) {
          return { ok: false, error: 'Rate limit exceeded. Please try again in a moment.' };
        }
        if (generateError.message.includes('timeout') || generateError.message.includes('Timeout')) {
          return { ok: false, error: 'Research timed out. Please try again.' };
        }
        return { ok: false, error: generateError.message };
      }

      return { ok: false, error: 'Research failed unexpectedly.' };
    }
  } catch (error) {
    console.error('researchCompanyForAccount error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Research failed',
    };
  }
}
