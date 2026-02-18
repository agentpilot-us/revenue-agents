import { generateObject, generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { z } from 'zod';
import { researchCompany } from '@/lib/tools/perplexity';
import { prisma } from '@/lib/db';
import { companyResearchSchema, type CompanyResearchData } from './company-research-schema';
import { buildCompanyResearchPrompt } from './company-research-prompt';

/** LM Studio only accepts response_format.type 'json_schema' or 'text'; generateObject sends a different format. Use generateText + parse when using LM Studio. */
const USE_LMSTUDIO_STRUCTURED_FALLBACK = process.env.LLM_PROVIDER === 'lmstudio';

export type ResearchCompanyResult =
  | { ok: true; data: CompanyResearchData }
  | { ok: false; error: string };

/**
 * Research a company and return structured data including basics, business overview,
 * Product fit, and micro-segments with roles/titles.
 */
export async function researchCompanyForAccount(
  companyName: string,
  companyDomain?: string
): Promise<ResearchCompanyResult> {
  try {
    // Step 1: Get catalog products for the prompt
    const catalogProducts = await prisma.catalogProduct.findMany({
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

    if (catalogProducts.length === 0) {
      return { ok: false, error: 'No catalog products found. Please set up products first.' };
    }

    // Step 2: Research company using Perplexity
    const researchQuery = `Research ${companyName}${companyDomain ? ` (${companyDomain})` : ''} and provide:
1. Company basics: official name, website, industry, employee count, headquarters location, annual revenue
2. What they do: core business description and key strategic initiatives
3. Technology focus areas: AI/ML, autonomous vehicles, manufacturing, design/CAD, data center, edge computing
4. Recent announcements: press releases, earnings calls, job postings that indicate priorities
5. Organizational structure: departments/divisions that would use enterprise software or AI technology
6. Buying groups: who makes technology decisions (departments, job titles, roles)

Focus on information relevant to B2B enterprise software sales, particularly AI infrastructure, autonomous vehicle technology, manufacturing automation, design collaboration, and data center solutions.`;

    const perplexityResult = await researchCompany({
      query: researchQuery,
      companyName,
      companyDomain,
    });

    if (!perplexityResult.ok) {
      return { ok: false, error: perplexityResult.error };
    }

    // Step 3: Structure the research using Anthropic (map Decimal to number for prompt)
    const catalogForPrompt = catalogProducts.map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceMin: p.priceMin != null ? Number(p.priceMin) : null,
      priceMax: p.priceMax != null ? Number(p.priceMax) : null,
      targetDepartments: p.targetDepartments as string[] | null,
    }));
    const systemPrompt = buildCompanyResearchPrompt(catalogForPrompt);

    if (process.env.USE_MOCK_LLM !== 'true' && process.env.LLM_PROVIDER !== 'lmstudio' && !process.env.ANTHROPIC_API_KEY) {
      return { ok: false, error: 'ANTHROPIC_API_KEY not configured' };
    }

    const userPrompt = `Company Name: ${companyName}
${companyDomain ? `Domain: ${companyDomain}` : ''}

Research Summary:
${perplexityResult.summary}

Based on this research, extract and structure the company information according to the schema.`;

    try {
      let object: unknown;
      if (USE_LMSTUDIO_STRUCTURED_FALLBACK) {
        console.log('Using generateText + JSON parse for LM Studio...');
        const jsonHint = `
Output a single JSON object with exactly these top-level keys: companyBasics (name, website, industry, employees, headquarters, revenue), whatTheyDo (summary, keyInitiatives), productFit (array of { product, useCase, whyRelevant }), microSegments (array of { name, departmentType?, useCase, products, estimatedOpportunity?, roles: { economicBuyer, technicalEvaluator, champion, influencer } }). No markdown, no code fences, no explanation.`;
        const { text } = await generateText({
          model: getChatModel(),
          system: systemPrompt + jsonHint,
          maxOutputTokens: 4000,
          prompt: userPrompt,
        });
        const raw = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        object = JSON.parse(raw) as unknown;
      } else {
        console.log('Calling generateObject with schema...');
        const result = await generateObject({
          model: getChatModel(),
          schema: companyResearchSchema,
          system: systemPrompt,
          maxOutputTokens: 4000,
          prompt: userPrompt,
        });
        object = result.object;
      }

      console.log('Validating result...');
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
        console.error('Error message:', generateError.message);
        if (generateError.message.includes('schema') || generateError.message.includes('validation')) {
          return { ok: false, error: `Structure error: ${generateError.message}` };
        }
        if (generateError.message.includes('API') || generateError.message.includes('key') || generateError.message.includes('401') || generateError.message.includes('403')) {
          return { ok: false, error: `API error: ${generateError.message}` };
        }
        if (generateError.message.includes('429') || generateError.message.includes('rate limit')) {
          return { ok: false, error: 'Rate limit exceeded. Please try again in a moment.' };
        }
        if (generateError.message.includes('timeout') || generateError.message.includes('Timeout')) {
          return { ok: false, error: 'Research request timed out. Please try again.' };
        }
        return { ok: false, error: generateError.message };
      }
      return { ok: false, error: 'Research failed unexpectedly.' };
    }
  } catch (error) {
    console.error('Research company error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Research failed';
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : {};
    console.error('Error details:', errorDetails);
    return {
      ok: false,
      error: errorMessage,
    };
  }
}
