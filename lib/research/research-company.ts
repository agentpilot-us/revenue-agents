import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';
import { researchCompany } from '@/lib/tools/perplexity';
import { prisma } from '@/lib/db';
import { companyResearchSchema, type CompanyResearchData } from './company-research-schema';
import {
  buildCompanyResearchPrompt,
  loadContentLibraryContext,
} from './company-research-prompt';
import {
  findRelevantContentLibraryChunks,
  getAllContentLibraryChunkContents,
} from '@/lib/content-library-rag';

export type ResearchCompanyResult =
  | { ok: true; data: CompanyResearchData }
  | { ok: false; error: string };

export type PerplexityOnlyResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

/**
 * Run only the Perplexity (web search) step. Use with structureResearchWithClaude for two-phase research with UI status.
 */
export async function runPerplexityResearchOnly(
  companyName: string,
  companyDomain: string | undefined,
  userId: string,
  userGoal?: string
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

  const contentLibraryProductsFirst =
    catalogProducts.length === 0
      ? await prisma.product.findMany({
          where: { userId },
          select: { name: true, description: true },
          orderBy: { name: 'asc' },
        })
      : [];

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
  const researchQuery = userGoal?.trim()
    ? `${companyName} organization structure, departments relevant to: ${userGoal.trim()}. Include headcount, key initiatives, and leadership for those teams. Also include company basics: website, industry, employee count, headquarters, revenue.`
    : `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''} and provide:

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

  return { ok: true, summary: perplexityResult.summary };
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
      findRelevantContentLibraryChunks(userId, ragQuery, 24),
      getAllContentLibraryChunkContents(userId, 50),
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

    const result = await generateObject({
      model: getChatModel(),
      schema: companyResearchSchema,
      system: systemPrompt,
      maxOutputTokens: 6000,
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
      findRelevantContentLibraryChunks(userId, ragQuery, 24),
      getAllContentLibraryChunkContents(userId, 50),
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
        maxOutputTokens: 6000,
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
