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
// Product fit per segment
// ─────────────────────────────────────────────────────────────

const productFitSchema = z.object({
  productSlug: z.string().optional().describe('Deprecated: use productName'),
  productName: z.string().describe('Exact product name from our catalog'),
  relevance: z
    .string()
    .describe('Why this product is relevant to this specific segment at this specific company'),
  estimatedOpportunity: z
    .string()
    .optional()
    .describe('Estimated deal size, e.g. "$500K – $2M"'),
});

// ─────────────────────────────────────────────────────────────
// Micro-segment (buying group) schema — core output unit
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
    .array(productFitSchema)
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
// Full company research schema (new flat + segmentation shape)
// ─────────────────────────────────────────────────────────────

export const companyResearchSchema = z.object({
  companyName: z.string().describe('Official company name'),
  website: z.string().optional().describe('Company website URL'),
  industry: z.string().optional().describe('Primary industry'),
  employees: z
    .string()
    .optional()
    .describe('Employee count as a string, e.g. "~167,000" or "500–1,000"'),
  headquarters: z.string().optional().describe('HQ location, e.g. "Santa Clara, CA"'),
  revenue: z
    .string()
    .optional()
    .describe('Annual revenue as a string, e.g. "$171.8B (2024)"'),

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
