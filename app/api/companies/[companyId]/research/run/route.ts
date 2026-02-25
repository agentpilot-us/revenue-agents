import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool, stepCountIs, type Tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getChatModel } from '@/lib/llm/get-model';
import {
  discoverBuyingGroupsForAccount,
  enrichBuyingGroup,
  scoreProductFitForGroup,
} from '@/lib/research/research-company';
import {
  buyingGroupSeedSchema,
  buyingGroupDetailSchema,
  companyBasicsSchema,
  type BuyingGroupSeed,
  type BuyingGroupDetail,
} from '@/lib/research/company-research-schema';
import { save4StepResearch } from '@/lib/research/save-4-step-research';
import { isDemoAccount } from '@/lib/demo/is-demo-account';

export const maxDuration = 120;

/** Passed to tools via experimental_context */
type ResearchContext = {
  companyId: string;
  companyName: string;
  companyDomain: string | null;
  userId: string;
  userGoal?: string | null;
};

function buildResearchSystemPrompt(companyName: string, userGoal?: string | null): string {
  const goalBlock = userGoal?.trim()
    ? `\nSALES REP GOAL (prioritize these buying groups, then suggest 2–3 more):\n${userGoal.trim()}\n`
    : '';
  return `You are an account intelligence AI. Research the target company and persist buying groups to the database.

TARGET COMPANY: ${companyName}${goalBlock}

WORKFLOW:
1. Call discover_buying_groups first (optionally with userGoal). You will receive basics (company basics), groups (4–6 buying group seeds), and perplexitySummary (raw research text).
2. For each item in groups, call enrich_buying_group with that group object and the perplexitySummary from step 1. You may call enrich_buying_group multiple times in parallel for different groups.
3. Optionally, for each enriched group, call score_product_fit with the enriched group to get product relevance scores and talking points. Merge the returned products into that group.
4. Finally call save_research_results with companyBasics (from step 1 basics) and enrichedGroups (the list of enriched groups, with or without product scores). Each group must have: name, segmentType, orgDepartment, valueProp, useCasesAtThisCompany, whyThisGroupBuys, objectionHandlers, roles, searchKeywords, seniorityByRole, and optionally products (array of { productName, relevance, talkingPoint }) and estimatedOpportunity.

Do not skip steps. After save_research_results, summarize what was saved (e.g. how many departments created/updated).`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
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
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (await isDemoAccount(companyId)) {
      return NextResponse.json({ error: 'Demo account is locked.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userGoal =
      typeof body.userGoal === 'string' ? body.userGoal.trim() || null : null;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const initialContent =
      messages.length > 0 && typeof messages[messages.length - 1] === 'object' && messages[messages.length - 1] !== null && 'content' in (messages[messages.length - 1] as object)
        ? String((messages[messages.length - 1] as { content: unknown }).content)
        : 'Research this account and build buying groups.';

    const experimental_context: ResearchContext = {
      companyId,
      companyName: company.name,
      companyDomain: company.domain,
      userId: session.user.id,
      userGoal,
    };

    const toolWithSchema = (config: any) => tool(config);

    const researchTools: Record<string, Tool> = {
      discover_buying_groups: toolWithSchema({
        description:
          'Research the target company and identify 4–6 buying groups (seeds). Returns company basics, group seeds, and perplexitySummary. Call this first; then pass perplexitySummary to each enrich_buying_group call.',
        inputSchema: z.object({
          userGoal: z.string().optional().describe('Optional sales rep targeting goal'),
        }),
        execute: async (
          params: { userGoal?: string },
          opts?: { experimental_context?: ResearchContext }
        ) => {
          const ctx = opts?.experimental_context;
          if (!ctx) throw new Error('Missing research context');
          const result = await discoverBuyingGroupsForAccount(
            ctx.companyName,
            ctx.companyDomain ?? undefined,
            ctx.userId,
            params.userGoal ?? ctx.userGoal ?? undefined
          );
          if (!result.ok) throw new Error(result.error);
          return {
            basics: result.data.basics,
            groups: result.data.groups,
            perplexitySummary: result.perplexitySummary,
          };
        },
      }),

      enrich_buying_group: toolWithSchema({
        description:
          'Enrich a single buying group (value prop, roles, search keywords, seniority). Pass the group from discover_buying_groups and the perplexitySummary from that same discover result.',
        inputSchema: z.object({
          group: buyingGroupSeedSchema,
          perplexitySummary: z.string().describe('Raw research text from discover_buying_groups result'),
        }),
        execute: async (
          params: { group: BuyingGroupSeed; perplexitySummary: string },
          opts?: { experimental_context?: ResearchContext }
        ) => {
          const ctx = opts?.experimental_context;
          if (!ctx) throw new Error('Missing research context');
          const result = await enrichBuyingGroup(
            ctx.companyName,
            ctx.companyDomain ?? undefined,
            params.group,
            ctx.userId,
            params.perplexitySummary,
            ctx.userGoal ?? undefined
          );
          if (!result.ok) throw new Error(result.error);
          return result.data;
        },
      }),

      score_product_fit: toolWithSchema({
        description:
          'Score how relevant each catalog product is to one buying group (0–100 + talking point). Pass an enriched group from enrich_buying_group. Returns the same group with products array filled.',
        inputSchema: z.object({
          group: buyingGroupDetailSchema,
        }),
        execute: async (
          params: { group: BuyingGroupDetail },
          opts?: { experimental_context?: ResearchContext }
        ) => {
          const ctx = opts?.experimental_context;
          if (!ctx) throw new Error('Missing research context');
          const catalogProducts = await prisma.catalogProduct.findMany({
            where: { userId: ctx.userId },
            select: { name: true },
            orderBy: { name: 'asc' },
          });
          const contentLibraryProducts =
            catalogProducts.length === 0
              ? await prisma.product.findMany({
                  where: { userId: ctx.userId },
                  select: { name: true },
                  orderBy: { name: 'asc' },
                })
              : [];
          const productNames =
            catalogProducts.length > 0
              ? catalogProducts.map((p) => p.name)
              : contentLibraryProducts.map((p) => p.name);
          if (productNames.length === 0) {
            return { ...params.group, products: [] };
          }
          const result = await scoreProductFitForGroup(params.group, productNames);
          if (!result.ok) throw new Error(result.error);
          return { ...params.group, products: result.products };
        },
      }),

      save_research_results: toolWithSchema({
        description:
          'Save company basics and enriched buying groups to the database. Call after all groups are enriched (and optionally product-scored). Pass basics from discover_buying_groups and the list of enriched groups.',
        inputSchema: z.object({
          companyBasics: companyBasicsSchema,
          enrichedGroups: z.array(buyingGroupDetailSchema).min(1),
        }),
        execute: async (
          params: { companyBasics: z.infer<typeof companyBasicsSchema>; enrichedGroups: BuyingGroupDetail[] },
          opts?: { experimental_context?: ResearchContext }
        ) => {
          const ctx = opts?.experimental_context;
          if (!ctx) throw new Error('Missing research context');
          const summary = await save4StepResearch({
            companyId: ctx.companyId,
            userId: ctx.userId,
            company: {
              id: company.id,
              name: company.name,
              website: company.website,
              industry: company.industry,
              employees: company.employees,
              headquarters: company.headquarters,
              revenue: company.revenue,
            },
            companyBasics: params.companyBasics,
            enrichedGroups: params.enrichedGroups.map((g) => ({
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
            researchGoal: ctx.userGoal ?? undefined,
            researchDataPayload: {
              companyBasics: params.companyBasics,
              enrichedGroups: params.enrichedGroups,
            },
          });
          return {
            saved: true,
            departmentsCreated: summary.departmentsCreated,
            departmentsUpdated: summary.departmentsUpdated,
            productsLinked: summary.productsLinked,
          };
        },
      }),
    };

    const result = streamText({
      model: getChatModel(),
      system: buildResearchSystemPrompt(company.name, userGoal),
      messages: [{ role: 'user', content: initialContent }],
      tools: researchTools,
      experimental_context,
      stopWhen: stepCountIs(15),
      abortSignal: req.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/run error:', error);
    const message = error instanceof Error ? error.message : 'Research run failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
