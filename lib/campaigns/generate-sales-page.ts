import { prisma } from '@/lib/db';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import {
  getCompanyEventsBlock,
  getCaseStudiesBlock,
  getActiveObjectionTexts,
  getExistingProductNames,
} from '@/lib/prompt-context';
import { buildExistingStackBlock } from '@/lib/products/resolve-product-framing';
import { getActiveObjectionsBlock } from '@/lib/account-messaging';
import { salesPageGenerateSchema, type SalesPageGenerateOutput } from '@/lib/campaigns/sales-page-schema';
import { buildSalesPagePrompt, type PageType } from '@/lib/campaigns/build-sales-page-prompt';

export type GenerateSalesPageParams = {
  companyId: string;
  userId: string;
  pageType: PageType;
  departmentId?: string | null;
  userGoal?: string | null;
};

/**
 * Generate sales page sections (headline, subheadline, sections, cta).
 * Used by POST /api/companies/[companyId]/campaigns/generate and by launch_campaign tool.
 */
export async function generateSalesPageSections(
  params: GenerateSalesPageParams
): Promise<{ ok: true; data: SalesPageGenerateOutput } | { ok: false; error: string }> {
  const { companyId, userId, pageType, departmentId, userGoal } = params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true, name: true, industry: true },
  });
  if (!company) {
    return { ok: false, error: 'Company not found' };
  }

  let segmentName = company.name;
  let valueProp: string | null = null;
  let departmentLabel: string | null = null;

  if (departmentId) {
    const dept = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
      select: { id: true, customName: true, type: true, valueProp: true },
    });
    if (!dept) {
      return { ok: false, error: 'Department not found or does not belong to this company' };
    }
    segmentName = dept.customName || dept.type.replace(/_/g, ' ');
    departmentLabel = dept.customName || dept.type.replace(/_/g, ' ');
    valueProp = dept.valueProp;
  }

  const [objectionTexts, productNames] = await Promise.all([
    getActiveObjectionTexts(companyId, userId),
    getExistingProductNames(companyId, userId),
  ]);

  const [eventsBlock, caseStudiesBlock, existingProductsBlock, objectionsBlock] = await Promise.all([
    getCompanyEventsBlock(userId, company.industry ?? null, departmentLabel, null, {
      activeObjections: objectionTexts,
      existingProducts: productNames,
    }),
    getCaseStudiesBlock(userId, company.industry ?? null, departmentLabel, []),
    buildExistingStackBlock(companyId, userId),
    getActiveObjectionsBlock(companyId, userId, departmentId ?? undefined),
  ]);

  const prompt = buildSalesPagePrompt({
    pageType,
    companyName: company.name,
    segmentName,
    valueProp,
    eventsBlock,
    caseStudiesBlock,
    existingProductsBlock,
    objectionsBlock,
    userGoal: userGoal ?? undefined,
  });

  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: salesPageGenerateSchema,
      prompt,
      maxOutputTokens: 3000,
    });

    const result = salesPageGenerateSchema.safeParse(object);
    if (!result.success) {
      console.error('Sales page generate schema validation failed:', result.error.flatten());
      return { ok: false, error: 'AI returned invalid section structure. Try again.' };
    }

    return {
      ok: true,
      data: {
        headline: result.data.headline,
        subheadline: result.data.subheadline ?? undefined,
        sections: result.data.sections,
        ctaLabel: result.data.ctaLabel ?? undefined,
        ctaUrl: result.data.ctaUrl ?? undefined,
      },
    };
  } catch (e) {
    console.error('generateSalesPageSections error:', e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Generate failed',
    };
  }
}
