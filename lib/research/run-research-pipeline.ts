/**
 * Deterministic research pipeline — replaces the agentic streamText loop.
 *
 * Fixed sequence: discover → enrich (parallel) → save.
 * Product fit is merged into the enrichment schema, eliminating
 * the separate scoreProductFitForGroup calls (4–6 fewer LLM calls).
 *
 * Total LLM calls: 1 (discover) + N (enrich, parallel) = 5–7.
 * Down from 18–26 with the agentic loop.
 *
 * Stradex note: this path loads the **userId** tenant’s My Company, catalog, and content library.
 * It does **not** consume `agentContext.stradexSellerProfile`. For multi-seller Stradex intake, keep
 * `STRADEX_BRIEF_RUN_BUYING_GROUPS` off unless the service user’s catalog represents one offering for
 * every lead (see docs/STRADEX_LEAD_BRIEF.md). Future: optional sellerOverride from company agentContext.
 */

import { prisma } from '@/lib/db';
import {
  discoverBuyingGroupsForAccount,
  enrichBuyingGroup,
} from './research-company';
import { save4StepResearch } from './save-4-step-research';
import { buildExistingStackBlock } from '@/lib/products/resolve-product-framing';
import type { BuyingGroupSeed, BuyingGroupDetail } from './company-research-schema';

export type PipelineProgress =
  | { step: 'discover_start' }
  | { step: 'discover_done'; groupCount: number }
  | { step: 'enrich_start'; index: number; total: number; groupName: string }
  | { step: 'enrich_done'; index: number; total: number; groupName: string }
  | { step: 'enrich_error'; index: number; groupName: string; error: string }
  | { step: 'save_start' }
  | { step: 'save_done'; departmentsCreated: number; departmentsUpdated: number; productsLinked: number }
  | { step: 'error'; message: string }
  | { step: 'complete'; summary: string };

export type PipelineParams = {
  companyId: string;
  userId: string;
  userGoal?: string | null;
  onProgress?: (event: PipelineProgress) => void;
};

export type PipelineResult =
  | { ok: true; summary: string; departmentsCreated: number; departmentsUpdated: number; productsLinked: number }
  | { ok: false; error: string };

export async function runResearchPipeline(params: PipelineParams): Promise<PipelineResult> {
  const { companyId, userId, userGoal, onProgress } = params;
  const emit = onProgress ?? (() => {});

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: {
      id: true,
      name: true,
      domain: true,
      website: true,
      industry: true,
      employees: true,
      headquarters: true,
      revenue: true,
    },
  });

  if (!company) {
    const msg = 'Company not found';
    emit({ step: 'error', message: msg });
    return { ok: false, error: msg };
  }

  // Step 1: Discover buying groups (1 Perplexity call + 1 LLM call)
  emit({ step: 'discover_start' });

  const discoverResult = await discoverBuyingGroupsForAccount(
    company.name,
    company.domain ?? undefined,
    userId,
    userGoal ?? undefined
  );

  if (!discoverResult.ok) {
    emit({ step: 'error', message: discoverResult.error });
    return { ok: false, error: discoverResult.error };
  }

  const { basics, groups } = discoverResult.data;
  const { perplexitySummary } = discoverResult;

  emit({ step: 'discover_done', groupCount: groups.length });

  // Fetch existing stack for enrichment context
  const existingStackBlock = await buildExistingStackBlock(companyId, userId);

  // Step 2: Enrich all groups in parallel (1 LLM call each)
  const enrichResults = await Promise.all(
    groups.map(async (seed: BuyingGroupSeed, index: number) => {
      emit({ step: 'enrich_start', index, total: groups.length, groupName: seed.name });
      try {
        const result = await enrichBuyingGroup(
          company.name,
          company.domain ?? undefined,
          seed,
          userId,
          perplexitySummary,
          userGoal ?? undefined,
          existingStackBlock ?? undefined
        );
        if (result.ok) {
          emit({ step: 'enrich_done', index, total: groups.length, groupName: seed.name });
          return { ok: true as const, data: result.data, seed };
        } else {
          emit({ step: 'enrich_error', index, groupName: seed.name, error: result.error });
          return { ok: false as const, error: result.error, seed };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Enrichment failed';
        emit({ step: 'enrich_error', index, groupName: seed.name, error: msg });
        return { ok: false as const, error: msg, seed };
      }
    })
  );

  const enrichedGroups: BuyingGroupDetail[] = [];
  const failures: string[] = [];
  for (const r of enrichResults) {
    if (r.ok) {
      enrichedGroups.push(r.data);
    } else {
      failures.push(`${r.seed.name}: ${r.error}`);
    }
  }

  if (enrichedGroups.length === 0) {
    const msg = `All groups failed enrichment: ${failures.join('; ')}`;
    emit({ step: 'error', message: msg });
    return { ok: false, error: msg };
  }

  // Step 3: Save (no LLM call — pure DB writes)
  emit({ step: 'save_start' });

  try {
    const saveResult = await save4StepResearch({
      companyId,
      userId,
      company: {
        id: company.id,
        name: company.name,
        website: company.website,
        industry: company.industry,
        employees: company.employees,
        headquarters: company.headquarters,
        revenue: company.revenue,
      },
      companyBasics: basics,
      enrichedGroups: enrichedGroups.map((g) => ({
        name: g.name,
        segmentType: g.segmentType,
        orgDepartment: g.orgDepartment,
        valueProp: g.valueProp,
        useCasesAtThisCompany: g.useCasesAtThisCompany,
        whyThisGroupBuys: g.whyThisGroupBuys,
        objectionHandlers: g.objectionHandlers,
        roles: g.roles,
        searchKeywords: g.searchKeywords,
        seniorityByRole: g.seniorityByRole,
        products: g.products?.map((p) => ({ productName: p.productName, productSlug: p.productSlug })),
        estimatedOpportunity: g.estimatedOpportunity,
      })),
      researchGoal: userGoal,
      researchDataPayload: {
        companyBasics: basics,
        enrichedGroups,
      },
    });

    const summary = `Saved ${enrichedGroups.length} buying groups (${saveResult.departmentsCreated} created, ${saveResult.departmentsUpdated} updated, ${saveResult.productsLinked} products linked).${failures.length > 0 ? ` ${failures.length} groups failed enrichment.` : ''}`;

    emit({
      step: 'save_done',
      departmentsCreated: saveResult.departmentsCreated,
      departmentsUpdated: saveResult.departmentsUpdated,
      productsLinked: saveResult.productsLinked,
    });
    emit({ step: 'complete', summary });

    return {
      ok: true,
      summary,
      departmentsCreated: saveResult.departmentsCreated,
      departmentsUpdated: saveResult.departmentsUpdated,
      productsLinked: saveResult.productsLinked,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save research';
    emit({ step: 'error', message: msg });
    return { ok: false, error: msg };
  }
}
