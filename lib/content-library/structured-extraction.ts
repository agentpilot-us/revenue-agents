/**
 * Content Library: Structured Extraction + Health Scoring
 *
 * 1. runStructuredExtraction / enrichScrapedContent — run after Firecrawl scrape, before storing
 * 2. scoreContentLibraryHealth — evaluate library completeness, surface gaps, pending review
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { getChatModel } from '@/lib/llm/get-model';
import type { ContentType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type PageType =
  | 'product'
  | 'solution'
  | 'use_case'
  | 'case_study'
  | 'pricing'
  | 'homepage'
  | 'about'
  | 'other';

export interface StructuredPageExtraction {
  pageType: PageType;
  valuePropositions: string[];
  capabilities: string[];
  proofPoints: string[];
  differentiators: string[];
  targetPersonas: string[];
  pricingStance: string;
  offBrandTopics: string[];
  keyMessages: string[];
  confidence: 'high' | 'medium' | 'low';
  missingSignals: string[];
}

export interface ContentHealthScore {
  overallScore: number;
  grade: 'Strong' | 'Good' | 'Needs Work' | 'Incomplete';
  dimensions: ContentHealthDimension[];
  gaps: ContentHealthGap[];
  recommendations: ContentHealthRecommendation[];
  readyForDemo: boolean;
  readyForOutreach: boolean;
  readyForBuyingGroups: boolean;
  pendingReviewCount: number;
  lowConfidenceCount: number;
}

export interface ContentHealthDimension {
  name: string;
  score: number;
  found: number;
  target: number;
  status: 'complete' | 'partial' | 'missing';
  items: string[];
  pendingCount?: number;
}

export interface ContentHealthGap {
  type: string;
  severity: 'critical' | 'important' | 'nice-to-have';
  message: string;
  suggestedAction: string;
  suggestedUrl?: string;
}

export interface ContentHealthRecommendation {
  priority: 1 | 2 | 3;
  action: string;
  reason: string;
  inputType: 'url' | 'upload' | 'manual';
}

export interface ContentLibraryItem {
  type: string;
  userConfirmed: boolean;
  extraction?: StructuredPageExtraction;
  content?: Record<string, unknown>;
  industry?: string;
  department?: string;
}

const PAGE_TYPE_TO_CONTENT_TYPE: Record<PageType, ContentType> = {
  product: 'FeatureRelease',
  solution: 'UseCase',
  use_case: 'UseCase',
  case_study: 'SuccessStory',
  pricing: 'ResourceLink',
  homepage: 'ResourceLink',
  about: 'ResourceLink',
  other: 'ResourceLink',
};

// ─────────────────────────────────────────────────────────────
// ZOD SCHEMA + EXTRACTION
// ─────────────────────────────────────────────────────────────

const extractionSchema = z.object({
  pageType: z.enum([
    'product',
    'solution',
    'use_case',
    'case_study',
    'pricing',
    'homepage',
    'about',
    'other',
  ]),
  valuePropositions: z
    .array(z.string())
    .describe(
      'Core value statements — what the company helps customers achieve. Format: "We help [persona] [outcome] without [pain]." Max 5.'
    ),
  capabilities: z
    .array(z.string())
    .describe(
      'Specific product features, capabilities, or functions mentioned. Be concrete — avoid marketing fluff. Max 10.'
    ),
  proofPoints: z
    .array(z.string())
    .describe(
      'Quantified results, customer names, statistics, awards, or logos mentioned. Include the number or company name. Max 8.'
    ),
  differentiators: z
    .array(z.string())
    .describe(
      'Explicit or implied reasons this is different from alternatives. Look for "unlike", "only", "first". Max 5.'
    ),
  targetPersonas: z
    .array(z.string())
    .describe(
      'Job titles, team names, or roles this page is written for. E.g. "VP of Sales", "Revenue Operations". Max 6.'
    ),
  pricingStance: z
    .string()
    .describe(
      'One sentence describing what is and is not communicated about pricing. E.g. "Pricing not mentioned — enterprise contact-us model implied."'
    ),
  offBrandTopics: z
    .array(z.string())
    .describe(
      'Topics, comparisons, or claims the page explicitly avoids or does not address. Max 4.'
    ),
  keyMessages: z
    .array(z.string())
    .describe(
      'The 3–5 most important things a prospect should take away from this page. One sentence each.'
    ),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'How much usable signal was found. High = clear product page with rich content. Low = nav page, error page, or thin content.'
    ),
  missingSignals: z
    .array(z.string())
    .describe(
      'What you expected to find on this page type but did not. E.g. "No customer proof points". Max 4.'
    ),
});

const EXTRACTION_SYSTEM_PROMPT = `
You are a B2B sales intelligence analyst extracting structured signal from company web pages.

Your job is to identify the content that a sales rep would actually use — not marketing fluff,
but the specific claims, proof points, personas, and messages that make outreach credible and
landing pages convert.

Rules:
- Be specific. "AI-powered" is not a capability. "Automated buying group discovery from website + LinkedIn" is.
- Be literal. Only extract what is actually on the page — do not infer or invent.
- Be concise. Each item should be one clear sentence or phrase.
- Flag gaps honestly. If a page type should have proof points but has none, say so in missingSignals.
- Pricing stance is always required — even if the answer is "not mentioned."
- Confidence reflects page quality, not your effort.

Page type detection hints:
- homepage: site root, brand overview, multiple CTA types
- product: specific feature or capability detail
- solution: industry or use-case framing of the product
- use_case: "how X team uses" framing
- case_study: specific customer story with outcomes
- pricing: plans, tiers, or contact-for-pricing
- about: company story, team, mission
- other: blog, legal, nav page, error page
`.trim();

/**
 * URL pattern classifier. Matches with or without trailing slash (e.g. /solutions and /solutions/).
 */
export function inferPageTypeHintFromUrl(url: string): PageType | null {
  const path = url.toLowerCase();
  const hints: [RegExp, PageType][] = [
    [/\/(case-stud|customer|success-stor|client-stor)(?:\/|$|-)/i, 'case_study'],
    [/\/(pricing|plans|tiers)(?:\/|$|-)/i, 'pricing'],
    [/\/(use-case|use_case|solutions?)(?:\/|$|-)/i, 'use_case'],
    [/\/(solutions?)(?:\/|$|-)/i, 'solution'],
    [/\/(product|platform|feature)(?:\/|$|-)/i, 'product'],
    [/\/(about|team|company|mission)(?:\/|$|-)/i, 'about'],
    [/\/(how-it-works|overview|why-us)(?:\/|$|-)/i, 'solution'],
  ];
  for (const [pattern, hint] of hints) {
    if (pattern.test(path)) return hint;
  }
  return null;
}

export type ChatModel = Parameters<typeof generateObject>[0]['model'];

/**
 * Run structured extraction on scraped markdown. Use 60k chars when URL suggests case_study.
 */
export async function runStructuredExtraction(
  url: string,
  markdown: string,
  model: ChatModel = getChatModel()
): Promise<StructuredPageExtraction> {
  const urlHint = inferPageTypeHintFromUrl(url);
  const maxChars = urlHint === 'case_study' ? 60_000 : 40_000;
  const content = markdown.slice(0, maxChars);

  const urlHintLine = urlHint ? `URL suggests this is a: ${urlHint}` : '';

  const userPrompt = `
URL: ${url}
${urlHintLine}

PAGE CONTENT:
${content}

Extract all available sales signal from this page.
`.trim();

  const result = await generateObject({
    model,
    schema: extractionSchema,
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  return result.object as StructuredPageExtraction;
}

/**
 * Drop-in replacement for categorizePage: scrape → this → store contentPayload with extraction.
 */
export async function enrichScrapedContent(
  url: string,
  markdown: string,
  model: ChatModel = getChatModel()
): Promise<{
  extraction: StructuredPageExtraction;
  contentPayload: Record<string, unknown>;
  suggestedType: string;
}> {
  const extraction = await runStructuredExtraction(url, markdown, model);
  const suggestedType = PAGE_TYPE_TO_CONTENT_TYPE[extraction.pageType] ?? 'ResourceLink';

  const contentPayload = {
    markdown: markdown.slice(0, 100_000),
    extraction: {
      pageType: extraction.pageType,
      valuePropositions: extraction.valuePropositions,
      capabilities: extraction.capabilities,
      proofPoints: extraction.proofPoints,
      differentiators: extraction.differentiators,
      targetPersonas: extraction.targetPersonas,
      pricingStance: extraction.pricingStance,
      offBrandTopics: extraction.offBrandTopics,
      keyMessages: extraction.keyMessages,
      confidence: extraction.confidence,
      missingSignals: extraction.missingSignals,
    },
    description: extraction.keyMessages[0] ?? '',
    suggestedType,
  };

  return { extraction, contentPayload, suggestedType };
}

/** Include only high/medium in health aggregation; low is surfaced as lowConfidenceCount. */
function includeInHealthAggregation(e: StructuredPageExtraction): boolean {
  return e.confidence !== 'low';
}

// ─────────────────────────────────────────────────────────────
// HEALTH SCORING
// ─────────────────────────────────────────────────────────────

function scoreDimension(
  name: string,
  items: string[],
  opts: { target: number; criticalThreshold: number },
  pendingCount?: number
): ContentHealthDimension {
  const found = items.length;
  const score = Math.min(100, Math.round((found / opts.target) * 100));
  const status =
    found >= opts.target ? 'complete' : found >= opts.criticalThreshold ? 'partial' : 'missing';
  return {
    name,
    score,
    found,
    target: opts.target,
    status,
    items: items.slice(0, opts.target),
    ...(pendingCount !== undefined && pendingCount > 0 ? { pendingCount } : {}),
  };
}

function buildRecommendations(
  gaps: ContentHealthGap[],
  caseStudiesCount: number,
  productUrl?: string
): ContentHealthRecommendation[] {
  const recs: ContentHealthRecommendation[] = [];
  const critical = gaps.filter((g) => g.severity === 'critical');
  const important = gaps.filter((g) => g.severity === 'important');

  if (critical[0]) {
    recs.push({
      priority: 1,
      action: critical[0].suggestedAction,
      reason: critical[0].message,
      inputType: critical[0].suggestedUrl ? 'url' : 'upload',
    });
  }
  const p2 = critical[1] ?? important[0];
  if (p2) {
    recs.push({
      priority: 2,
      action: p2.suggestedAction,
      reason: p2.message,
      inputType: p2.suggestedUrl ? 'url' : 'upload',
    });
  }
  if (caseStudiesCount === 0 && productUrl) {
    recs.push({
      priority: 3,
      action: `Crawl ${productUrl}/customers for case studies`,
      reason: 'Case studies are the highest-impact content for landing pages and outreach.',
      inputType: 'url',
    });
  }
  return recs.slice(0, 3);
}

/**
 * Score content library health. Includes both confirmed and unconfirmed items (pending review).
 * Applies confidence weighting: low-confidence extractions excluded from dimension counts and surfaced as lowConfidenceCount.
 */
export function scoreContentLibraryHealth(
  items: ContentLibraryItem[],
  productUrl?: string
): ContentHealthScore {
  const unconfirmed = items.filter((i) => !i.userConfirmed);
  const pendingReviewCount = unconfirmed.length;

  const allItemsWithExtraction = items.filter((i) => i.extraction) as (ContentLibraryItem & {
    extraction: StructuredPageExtraction;
  })[];
  const forAggregation = allItemsWithExtraction.filter((i) =>
    includeInHealthAggregation(i.extraction)
  );
  const lowConfidenceCount = allItemsWithExtraction.filter(
    (i) => i.extraction.confidence === 'low'
  ).length;

  const weightContrib = (
    arr: string[],
    weight: number
  ): number => (arr.length ? Math.min(arr.length, Math.ceil(arr.length * weight)) : 0);

  const valueProps: string[] = [];
  const capabilities: string[] = [];
  const proofPoints: string[] = [];
  const differentiators: string[] = [];
  const personas: string[] = [];
  let valuePropsPending = 0;
  let capPending = 0;
  let proofPending = 0;

  for (const item of allItemsWithExtraction) {
    const e = item.extraction;
    if (!includeInHealthAggregation(e)) continue;
    for (const v of e.valuePropositions) {
      valueProps.push(v);
      if (!item.userConfirmed) valuePropsPending++;
    }
    for (const c of e.capabilities) {
      capabilities.push(c);
      if (!item.userConfirmed) capPending++;
    }
    for (const p of e.proofPoints) {
      proofPoints.push(p);
      if (!item.userConfirmed) proofPending++;
    }
    for (const d of e.differentiators) differentiators.push(d);
    for (const p of e.targetPersonas) personas.push(p);
  }

  const caseStudies = items.filter(
    (i) => i.type === 'SuccessStory' || (i.content as { type?: string })?.type === 'SuccessStory'
  );
  const useCases = items.filter(
    (i) => i.type === 'UseCase' || (i.content as { type?: string })?.type === 'UseCase'
  );
  const caseStudiesCount = caseStudies.length;

  const pricingStances = forAggregation
    .map((i) => i.extraction.pricingStance)
    .filter((s) => s && !s.toLowerCase().includes('not mentioned'));

  const dimensions: ContentHealthDimension[] = [
    scoreDimension(
      'Value Propositions',
      valueProps,
      { target: 3, criticalThreshold: 1 },
      valuePropsPending > 0 ? valuePropsPending : undefined
    ),
    scoreDimension(
      'Product Capabilities',
      capabilities,
      { target: 5, criticalThreshold: 2 },
      capPending > 0 ? capPending : undefined
    ),
    scoreDimension(
      'Customer Proof Points',
      proofPoints,
      { target: 3, criticalThreshold: 1 },
      proofPending > 0 ? proofPending : undefined
    ),
    scoreDimension('Differentiators', differentiators, { target: 2, criticalThreshold: 1 }),
    scoreDimension('Target Personas', personas, { target: 3, criticalThreshold: 1 }),
    {
      name: 'Case Studies',
      score: Math.min(100, (caseStudiesCount / 2) * 100),
      found: caseStudiesCount,
      target: 2,
      status:
        caseStudiesCount >= 2 ? 'complete' : caseStudiesCount === 1 ? 'partial' : 'missing',
      items: caseStudies.map(
        (i) =>
          (i.content?.company as string) ||
          (i.content?.headline as string) ||
          (i.content?.extraction as { keyMessages?: string[] })?.keyMessages?.[0] ||
          'Case study'
      ),
    },
    {
      name: 'Use Cases',
      score: Math.min(100, (useCases.length / 3) * 100),
      found: useCases.length,
      target: 3,
      status: useCases.length >= 3 ? 'complete' : useCases.length > 0 ? 'partial' : 'missing',
      items: useCases.map(
        (i) =>
          (i.content?.name as string) ||
          (i.content?.extraction as { keyMessages?: string[] })?.keyMessages?.[0] ||
          'Use case'
      ),
    },
    {
      name: 'Pricing Stance',
      score: pricingStances.length > 0 ? 100 : 0,
      found: pricingStances.length,
      target: 1,
      status: pricingStances.length > 0 ? 'complete' : 'missing',
      items: pricingStances.slice(0, 1),
    },
  ];

  const weights: Record<string, number> = {
    'Value Propositions': 0.2,
    'Product Capabilities': 0.2,
    'Customer Proof Points': 0.2,
    Differentiators: 0.1,
    'Target Personas': 0.1,
    'Case Studies': 0.1,
    'Use Cases': 0.05,
    'Pricing Stance': 0.05,
  };

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * (weights[d.name] ?? 0.05), 0)
  );

  const grade =
    overallScore >= 80 ? 'Strong' : overallScore >= 60 ? 'Good' : overallScore >= 35 ? 'Needs Work' : 'Incomplete';

  const gaps: ContentHealthGap[] = [];

  if (valueProps.length === 0) {
    gaps.push({
      type: 'value_propositions',
      severity: 'critical',
      message: 'No value propositions found — AI outreach and landing pages will be generic.',
      suggestedAction: 'Scrape your homepage or product overview page.',
      suggestedUrl: productUrl,
    });
  }
  if (capabilities.length < 2) {
    gaps.push({
      type: 'capabilities',
      severity: 'critical',
      message: 'Not enough product capabilities found — not enough to personalize by buying group.',
      suggestedAction: 'Scrape your product or features page.',
      suggestedUrl: productUrl ? `${productUrl}/product` : undefined,
    });
  }
  if (proofPoints.length === 0) {
    gaps.push({
      type: 'proof_points',
      severity: 'critical',
      message: 'No customer proof points found — outreach will lack credibility.',
      suggestedAction: 'Add a customer page URL or upload a case study.',
      suggestedUrl: productUrl ? `${productUrl}/customers` : undefined,
    });
  }
  if (caseStudiesCount === 0) {
    gaps.push({
      type: 'case_studies',
      severity: 'critical',
      message: 'No case studies — landing pages and chat cannot reference customer success.',
      suggestedAction: 'Crawl your /customers or /case-studies page.',
      suggestedUrl: productUrl ? `${productUrl}/customers` : undefined,
    });
  } else if (caseStudiesCount === 1) {
    gaps.push({
      type: 'case_studies',
      severity: 'important',
      message: 'Only 1 case study — buying groups need industry-relevant proof.',
      suggestedAction: 'Add 1–2 more case studies from different industries.',
    });
  }
  if (personas.length === 0) {
    gaps.push({
      type: 'personas',
      severity: 'important',
      message: 'No target personas identified — buying group mapping will be less precise.',
      suggestedAction: 'Scrape your "Who we serve" or solutions page.',
    });
  }
  if (useCases.length === 0) {
    gaps.push({
      type: 'use_cases',
      severity: 'important',
      message: 'No use cases — chat and outreach cannot match your product to buyer problems.',
      suggestedAction: 'Scrape your use cases or solutions page.',
      suggestedUrl: productUrl ? `${productUrl}/use-cases` : undefined,
    });
  }
  if (pricingStances.length === 0) {
    gaps.push({
      type: 'pricing',
      severity: 'nice-to-have',
      message: 'Pricing stance not captured — AI may give inconsistent answers about cost.',
      suggestedAction: 'Scrape your pricing page or upload a pricing FAQ.',
      suggestedUrl: productUrl ? `${productUrl}/pricing` : undefined,
    });
  }
  if (differentiators.length === 0) {
    gaps.push({
      type: 'differentiators',
      severity: 'nice-to-have',
      message: 'No differentiators found — AI cannot contrast you against competitors.',
      suggestedAction: 'Scrape your "Why us" or comparison page.',
    });
  }

  const recommendations = buildRecommendations(gaps, caseStudiesCount, productUrl);

  const criticalGaps = gaps.filter((g) => g.severity === 'critical');
  const readyForDemo = overallScore >= 60 && criticalGaps.length <= 1;
  const readyForOutreach = overallScore >= 75 && criticalGaps.length === 0;
  const readyForBuyingGroups = personas.length >= 2 && useCases.length >= 1 && valueProps.length >= 1;

  return {
    overallScore,
    grade,
    dimensions,
    gaps,
    recommendations,
    readyForDemo,
    readyForOutreach,
    readyForBuyingGroups,
    pendingReviewCount,
    lowConfidenceCount,
  };
}
