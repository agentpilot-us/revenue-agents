import { z } from 'zod';
import { DepartmentType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// Target Roles — searchable LinkedIn titles per role type
// ─────────────────────────────────────────────────────────────

export const targetRolesSchema = z.object({
  economicBuyer: z
    .array(z.string())
    .min(1)
    .describe('Budget owners and approvers — VP, C-suite, Director level. Use searchable LinkedIn titles.'),
  technicalEvaluator: z
    .array(z.string())
    .min(1)
    .describe('Technical or operational evaluators — Director/Manager level. Use searchable LinkedIn titles.'),
  champion: z
    .array(z.string())
    .min(1)
    .describe('Senior ICs or team leads who advocate for the solution internally.'),
  influencer: z
    .array(z.string())
    .min(1)
    .describe('Day-to-day users or stakeholders who influence the decision.'),
});

export type TargetRoles = z.infer<typeof targetRolesSchema>;

// ─────────────────────────────────────────────────────────────
// New account-intel primitives (segment types, seeds, details)
// ─────────────────────────────────────────────────────────────

export const segmentTypeSchema = z.enum(['FUNCTIONAL', 'USE_CASE', 'DIVISIONAL']);
export type SegmentType = z.infer<typeof segmentTypeSchema>;

export const buyingGroupSeedSchema = z.object({
  id: z.string().describe('Stable client-generated id used to track this seed through the flow'),
  name: z
    .string()
    .describe('Buying group name, e.g. "Autonomous Vehicle Software Team" or "Manufacturing Operations"'),
  rationale: z
    .string()
    .describe('One sentence on why this group matters for buying our products at this company.'),
  segmentType: segmentTypeSchema.describe(
    'FUNCTIONAL (by department), USE_CASE (by what they do), or DIVISIONAL (by business unit/product line).'
  ),
  orgFunction: z
    .string()
    .describe('Org-chart function this group rolls up to, e.g. "Software Engineering", "Manufacturing".'),
  divisionOrProduct: z
    .string()
    .nullable()
    .optional()
    .describe('Division, business unit, or product line name, e.g. "Autonomous Driving", "GM Defense".'),
});
export type BuyingGroupSeed = z.infer<typeof buyingGroupSeedSchema>;

const seniorityByRoleSchema = z.object({
  economicBuyer: z
    .array(z.string())
    .default([])
    .describe('Apollo seniority levels for economic buyers, e.g. ["c_suite", "vp", "director"].'),
  technicalEvaluator: z
    .array(z.string())
    .default([])
    .describe('Apollo seniority levels for technical evaluators.'),
  champion: z
    .array(z.string())
    .default([])
    .describe('Apollo seniority levels for champions.'),
  influencer: z
    .array(z.string())
    .default([])
    .describe('Apollo seniority levels for influencers / day-to-day users.'),
});
export type SeniorityByRole = z.infer<typeof seniorityByRoleSchema>;

// ─────────────────────────────────────────────────────────────
// Product fit per segment (new lightweight type)
// ─────────────────────────────────────────────────────────────

export const productFitSchema = z.object({
  productSlug: z.string().optional().describe('Deprecated: use productName'),
  productName: z.string().describe('Exact product name from our catalog'),
  relevance: z
    .number()
    .min(0)
    .max(100)
    .describe('0–100 numeric relevance score for this product → this buying group.'),
  talkingPoint: z
    .string()
    .describe('One-sentence talking point tying this product to the buying group, for contact cards.'),
  estimatedOpportunity: z
    .string()
    .optional()
    .describe('Estimated deal size, e.g. "$500K – $2M"'),
});

export type ProductFit = z.infer<typeof productFitSchema>;

/** Step 3: one group's product fit scores (productName, relevance, talkingPoint per product). */
export const productFitListSchema = z.object({
  products: z
    .array(productFitSchema)
    .describe('Score and talking point for each catalog product relevant to this buying group.'),
});

// Legacy product fit (monolithic flow): relevance string, no talkingPoint
const legacyProductFitSchema = z.object({
  productSlug: z.string().optional(),
  productName: z.string(),
  relevance: z.string().describe('Relevance description or score'),
});

// Legacy micro-segment schema (monolithic flow) — kept for compatibility
// ─────────────────────────────────────────────────────────────

export const microSegmentSchema = z.object({
  name: z
    .string()
    .describe('Buying group name, e.g. "Revenue Operations", "Autonomous Driving Team"'),
  departmentType: z
    .nativeEnum(DepartmentType)
    .optional()
    .describe('DepartmentType enum value if applicable, otherwise omit'),
  customName: z
    .string()
    .optional()
    .describe('Use when departmentType does not capture the nuance (e.g. "Sales Enablement")'),
  whyThisGroupMatters: z
    .string()
    .describe('Their business priority and budget authority — why they are a relevant buying group'),

  valueProp: z
    .string()
    .describe(
      'Value proposition specific to this segment at this company. Lead with their pain or initiative. 2–3 sentences.'
    ),
  useCasesAtThisCompany: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe(
      'Concrete use cases showing HOW this segment would use our product at this specific company. Include expected outcome.'
    ),
  proofPoints: z
    .array(z.string())
    .optional()
    .describe(
      'Relevant case studies, success stories, or industry playbooks from our Content Library that apply to this segment'
    ),
  relevantEvents: z
    .array(z.string())
    .optional()
    .describe('Events from our Content Library that this buying group should be invited to'),
  objectionHandlers: z
    .array(
      z.object({
        objection: z.string().describe('The objection this buyer is likely to raise'),
        response: z
          .string()
          .describe('Our response, grounded in use cases and proof points'),
      })
    )
    .min(1)
    .max(4)
    .describe('Top objections this buying group will raise and how to handle them'),

  targetRoles: targetRolesSchema,

  products: z
    .array(legacyProductFitSchema)
    .min(1)
    .describe('Products from our catalog relevant to this segment'),

  useCase: z
    .string()
    .optional()
    .describe('Deprecated: use useCasesAtThisCompany instead; single summary if needed'),
  estimatedOpportunity: z
    .string()
    .optional()
    .describe('Total opportunity for this segment, e.g. "$500K – $2M"'),
});

export type MicroSegment = z.infer<typeof microSegmentSchema>;

// ─────────────────────────────────────────────────────────────
// New BuyingGroupDetail & ProductFitScore for 4-step flow
// ─────────────────────────────────────────────────────────────

export const buyingGroupDetailSchema = z.object({
  // Identity
  name: z
    .string()
    .describe('Buying group name, e.g. "Autonomous Vehicle Software Team" or "Manufacturing Operations".'),
  segmentType: segmentTypeSchema.describe('Segmentation type for this group.'),
  orgDepartment: z
    .string()
    .describe('Org-chart department label used for Apollo department filters, e.g. "Engineering".'),

  // Messaging
  valueProp: z
    .string()
    .describe('2–3 sentence value proposition specific to this group at this company.'),
  useCasesAtThisCompany: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe('2–3 concrete use cases at this company for this group.'),
  whyThisGroupBuys: z
    .string()
    .describe('One-sentence summary: why this group cares / what outcome they want.'),
  objectionHandlers: z
    .array(
      z.object({
        objection: z.string(),
        response: z.string(),
      })
    )
    .min(1)
    .max(4)
    .describe('Top objections for this group and how to respond.'),

  // Contact finding — direct inputs for resolveSearchContext / Apollo
  roles: targetRolesSchema,
  searchKeywords: z
    .array(z.string())
    .default([])
    .describe(
      'Search keywords for LinkedIn/Apollo, especially important for USE_CASE or DIVISIONAL segments (e.g. "autonomous driving", "ADAS").'
    ),
  seniorityByRole: seniorityByRoleSchema,

  // Product fit (populated in Step 3)
  products: z
    .array(productFitSchema)
    .default([])
    .describe('Per-product fit scores and talking points for this group.'),
  estimatedOpportunity: z
    .string()
    .optional()
    .describe('Optional total opportunity for this group, e.g. "$500K – $2M".'),
});

export type BuyingGroupDetail = z.infer<typeof buyingGroupDetailSchema>;

export const companyBasicsSchema = z.object({
  name: z.string().describe('Official company name.'),
  website: z.string().optional().describe('Company website URL.'),
  industry: z.string().optional().describe('Primary industry.'),
  employees: z.string().optional().describe('Employee count, e.g. "~5,000" or "500–1,000".'),
  headquarters: z.string().optional().describe('HQ, e.g. "Detroit, Michigan".'),
  revenue: z.string().optional().describe('Annual revenue, e.g. "$500M (2024)".'),
});

export const discoverGroupsResultSchema = z.object({
  basics: companyBasicsSchema,
  groups: z.array(buyingGroupSeedSchema).min(1),
});

export type DiscoverGroupsResult = z.infer<typeof discoverGroupsResultSchema>;

export const productFitScoreSchema = productFitSchema.extend({
  groupName: z.string().describe('Name of the buying group this score applies to.'),
});

export type ProductFitScore = z.infer<typeof productFitScoreSchema>;

// ─────────────────────────────────────────────────────────────
// Full company research schema (new flat + segmentation shape)
// ─────────────────────────────────────────────────────────────

export const companyResearchSchema = z.object({
  companyName: z.string().describe('Official company name'),
  website: z.string().optional().describe('Company website URL'),
  industry: z.string().optional().describe('Primary industry'),
  employees: z
    .string()
    .optional()
    .describe('Employee count from research only, e.g. "~5,000" or "500–1,000". Omit if not in research.'),
  headquarters: z
    .string()
    .optional()
    .describe('HQ city/region from research only, e.g. "San Francisco, CA". Omit if not in research.'),
  revenue: z
    .string()
    .optional()
    .describe('Annual revenue from research only, e.g. "$500M (2024)". Omit if not in research.'),

  businessOverview: z
    .string()
    .describe('2–3 sentence summary of what this company does and who they serve'),
  keyInitiatives: z
    .array(z.string())
    .default([])
    .describe(
      'Specific, actionable strategic initiatives — from recent press, earnings, or job postings.'
    ),

  segmentationStrategy: z
    .enum(['FUNCTIONAL', 'USE_CASE', 'DIVISIONAL', 'HYBRID'])
    .describe('How buying groups are best segmented at this company'),
  segmentationRationale: z
    .string()
    .describe(
      'Why you chose this segmentation approach based on the company structure and buying dynamics'
    ),

  microSegments: z
    .array(microSegmentSchema)
    .min(1)
    .describe(
      'Buying groups at the target company. Must have at least one. Each includes value prop, use cases, objection handlers, and contact titles.'
    ),

  accountLevelObjections: z
    .array(
      z.object({
        objection: z.string(),
        response: z.string(),
      })
    )
    .optional()
    .describe('Objections that apply at the account level, not specific to one segment'),

  techStack: z
    .array(z.string())
    .optional()
    .describe(
      'Known tools, platforms, or vendors they use — useful for integration messaging'
    ),

  researchData: z
    .string()
    .optional()
    .describe('Raw research summary for audit/debugging'),
});

export type CompanyResearchData = z.infer<typeof companyResearchSchema>;
