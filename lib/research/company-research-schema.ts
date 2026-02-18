import { z } from 'zod';
import { DepartmentType } from '@prisma/client';

// Create a Zod enum from Prisma enum
const DepartmentTypeEnum = z.nativeEnum(DepartmentType);

export const companyResearchSchema = z.object({
  companyBasics: z.object({
    name: z.string().describe('Official company name'),
    website: z.string().optional().describe('Company website URL'),
    industry: z.string().optional().describe('Industry category'),
    employees: z.string().optional().describe('Approximate headcount, e.g., "~167,000"'),
    headquarters: z.string().optional().describe('Headquarters location, e.g., "Detroit, Michigan"'),
    revenue: z.string().optional().describe('Annual revenue if public, e.g., "$171.8B (2024)"'),
  }),
  whatTheyDo: z.object({
    summary: z.string().describe('2-3 sentence description of the company\'s core business'),
    keyInitiatives: z.array(z.string()).describe('Major initiatives with specifics'),
  }),
  productFit: z.array(
    z.object({
      product: z.string().describe('Product name (must match a CatalogProduct name)'),
      useCase: z.string().describe('Specific use case at this company'),
      whyRelevant: z.string().describe('Why this product matters for them specifically'),
    })
  ),
  microSegments: z.array(
    z.object({
      name: z.string().describe('Department/Division name'),
      departmentType: DepartmentTypeEnum.optional().describe('DepartmentType enum if matches'),
      useCase: z.string().describe('What they would use these products for'),
      products: z.array(z.string()).min(1).describe('Array of product slugs (must match CatalogProduct slugs)'),
      estimatedOpportunity: z.string().optional().describe('Estimated opportunity size, e.g., "$500K - $2M"'),
      roles: z.object({
        economicBuyer: z.array(z.string()).default([]).describe('Job titles for economic buyers, e.g., ["VP Engineering", "CTO"]'),
        technicalEvaluator: z.array(z.string()).default([]).describe('Job titles for technical evaluators, e.g., ["Director ML", "Director Perception"]'),
        champion: z.array(z.string()).default([]).describe('Job titles for champions, e.g., ["Senior ML Engineer", "Tech Lead"]'),
        influencer: z.array(z.string()).default([]).describe('Job titles for influencers, e.g., ["ML Engineer", "Perception Engineer"]'),
      }),
    })
  ).min(1),
});

export type CompanyResearchData = z.infer<typeof companyResearchSchema>;
