'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateObject } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import { DepartmentType, DepartmentStatus, ProductOwnershipStatus } from '@prisma/client';
import { z } from 'zod';

const researchExtractionSchema = z.object({
  departments: z.array(
    z.object({
      type: z.nativeEnum(DepartmentType),
      customName: z.string().optional().nullable(),
      estimatedSize: z.number().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
  ),
  productInterests: z.array(
    z.object({
      departmentType: z.nativeEnum(DepartmentType),
      productSlug: z.string(),
      valueProp: z.string(),
      opportunitySize: z.number().optional().nullable(),
    })
  ),
});

export type ApplyResearchResult = {
  departmentsCreated: number;
  departmentsUpdated: number;
  companyProductsCreated: number;
  companyProductsUpdated: number;
  departmentNames: string[];
  productInterestSummary: Array<{ department: string; product: string; valueProp: string }>;
};

export async function applyDepartmentProductResearch(
  companyId: string,
  researchText: string,
  productFocus?: string
): Promise<ApplyResearchResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });
  if (!company) {
    throw new Error('Company not found');
  }

  const catalogProducts = await prisma.catalogProduct.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
    select: { id: true, slug: true, name: true },
  });

  const productListForPrompt = catalogProducts
    .map((p) => `- ${p.name} (slug: ${p.slug})`)
    .join('\n');

  const { object } = await generateObject({
    model: getChatModel(),
    schema: researchExtractionSchema,
    prompt: `
You are extracting structured data from research text about a company. The goal is to identify:
1. Which departments/business units exist or are relevant (map to the DepartmentType enum).
2. Which products each department is interested in and why (value proposition).

RESEARCH TEXT:
${researchText}
${productFocus ? `\nPRODUCT FOCUS (emphasize interests related to): ${productFocus}` : ''}

AVAILABLE PRODUCTS (use exact slug in productInterests):
${productListForPrompt}

DEPARTMENT TYPES (use exactly one of these for type/departmentType):
${Object.values(DepartmentType).join(', ')}

INSTRUCTIONS:
- Extract every department mentioned or implied. Use notes to store context or value prop for that department.
- For productInterests: each entry links a department (by departmentType) to a product (by productSlug) with a short valueProp (why they care / use case). Only include products from the list above; if the research mentions a product not in the list, skip it or map to the closest slug.
- If the research does not mention specific products, you may still extract departments with notes.
- Keep valueProp concise (1-2 sentences).
    `.trim(),
  });

  let departmentsCreated = 0;
  let departmentsUpdated = 0;
  const departmentIdsByType: Record<string, string> = {};

  for (const dept of object.departments) {
    const existing = await prisma.companyDepartment.findUnique({
      where: {
        companyId_type: { companyId, type: dept.type },
      },
    });

    if (existing) {
      await prisma.companyDepartment.update({
        where: { id: existing.id },
        data: {
          customName: dept.customName ?? undefined,
          estimatedSize: dept.estimatedSize ?? undefined,
          notes: dept.notes ?? undefined,
        },
      });
      departmentsUpdated++;
      departmentIdsByType[dept.type] = existing.id;
    } else {
      const created = await prisma.companyDepartment.create({
        data: {
          companyId,
          type: dept.type,
          customName: dept.customName ?? undefined,
          status: DepartmentStatus.RESEARCH_PHASE,
          estimatedSize: dept.estimatedSize ?? undefined,
          notes: dept.notes ?? undefined,
        },
      });
      departmentsCreated++;
      departmentIdsByType[dept.type] = created.id;
    }
  }

  let companyProductsCreated = 0;
  let companyProductsUpdated = 0;
  const productInterestSummary: Array<{ department: string; product: string; valueProp: string }> = [];

  for (const pi of object.productInterests) {
    const product = catalogProducts.find((p) => p.slug === pi.productSlug);
    const departmentId = departmentIdsByType[pi.departmentType];
    if (!product || !departmentId) continue;

    const existing = await prisma.companyProduct.findUnique({
      where: {
        companyId_companyDepartmentId_productId: {
          companyId,
          companyDepartmentId: departmentId,
          productId: product.id,
        },
      },
    });

    const deptLabel = pi.departmentType.replace(/_/g, ' ');
    productInterestSummary.push({
      department: deptLabel,
      product: product.name,
      valueProp: pi.valueProp,
    });

    if (existing) {
      await prisma.companyProduct.update({
        where: { id: existing.id },
        data: {
          fitReasoning: pi.valueProp,
          ...(pi.opportunitySize != null && { opportunitySize: pi.opportunitySize }),
          status: ProductOwnershipStatus.OPPORTUNITY,
        },
      });
      companyProductsUpdated++;
    } else {
      await prisma.companyProduct.create({
        data: {
          companyId,
          companyDepartmentId: departmentId,
          productId: product.id,
          status: ProductOwnershipStatus.OPPORTUNITY,
          fitReasoning: pi.valueProp,
          opportunitySize: pi.opportunitySize ?? undefined,
        },
      });
      companyProductsCreated++;
    }
  }

  const departmentNames = object.departments.map((d) =>
    d.customName ? `${d.type.replace(/_/g, ' ')} (${d.customName})` : d.type.replace(/_/g, ' ')
  );

  return {
    departmentsCreated,
    departmentsUpdated,
    companyProductsCreated,
    companyProductsUpdated,
    departmentNames,
    productInterestSummary,
  };
}
