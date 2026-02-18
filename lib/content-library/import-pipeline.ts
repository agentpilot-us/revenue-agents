import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/get-model';
import type { ContentType } from '@prisma/client';

const SUGGESTED_TYPE_MAP: Record<string, ContentType> = {
  case_study: 'SuccessStory',
  success_story: 'SuccessStory',
  customer_story: 'SuccessStory',
  event: 'CompanyEvent',
  webinar: 'CompanyEvent',
  conference: 'CompanyEvent',
  product: 'FeatureRelease',
  feature: 'FeatureRelease',
  solution: 'UseCase',
  use_case: 'UseCase',
  solutionpage: 'UseCase',
  playbook: 'Framework',
  framework: 'Framework',
  methodology: 'Framework',
  industryplaybook: 'Framework',
  pricing: 'ResourceLink',
  whitepaper: 'ResourceLink',
  guide: 'ResourceLink',
  other: 'ResourceLink',
};

/** Map AI suggestedType string to ContentType enum for ContentLibrary. */
export function suggestedTypeToContentType(suggested: string): ContentType {
  const normalized = suggested.toLowerCase().replace(/\s+/g, '_');
  if (normalized in SUGGESTED_TYPE_MAP) return SUGGESTED_TYPE_MAP[normalized];
  for (const [key, type] of Object.entries(SUGGESTED_TYPE_MAP)) {
    if (normalized.includes(key)) return type;
  }
  return 'ResourceLink';
}


/** Map industry value to URL/path keywords for filtering. */
export function industryToKeywords(industry: string): string[] {
  const lower = industry.toLowerCase();
  const map: Record<string, string[]> = {
    automotive: ['automotive', 'vehicle', 'drive', 'autonomous', 'car', 'av'],
    healthcare: ['healthcare', 'health', 'medical', 'clinical', 'pharma'],
    manufacturing: ['manufacturing', 'industrial', 'factory', 'production'],
    financial_services: ['financial', 'finance', 'banking', 'fintech'],
    retail: ['retail', 'commerce', 'ecommerce', 'store'],
    energy: ['energy', 'utility', 'power', 'oil', 'gas', 'renewable'],
    technology: ['technology', 'tech', 'software', 'solution', 'platform'],
    other: [],
  };
  return map[lower] ?? [lower.replace(/[^a-z0-9]/g, ' ')];
}

export type CrawlPage = { markdown?: string; metadata?: { sourceURL?: string } };

/** Filter crawl data by URL containing any of the industry keywords. */
export function filterByIndustry(
  data: CrawlPage[],
  primaryIndustry: string,
  additionalIndustries: string[] = []
): CrawlPage[] {
  const keywords = [
    ...industryToKeywords(primaryIndustry),
    ...additionalIndustries.flatMap(industryToKeywords),
  ];
  if (keywords.length === 0) return data;
  const seen = new Set<string>();
  return data.filter((item) => {
    const url = (item.metadata?.sourceURL ?? '').toLowerCase();
    if (!url) return false;
    const match = keywords.some((k) => url.includes(k));
    if (!match) return false;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export type CategorizedItem = {
  title: string;
  description: string;
  suggestedType: string;
  industry?: string;
  department?: string;
};

/** Categorize a single page with AI. */
export async function categorizePage(
  url: string,
  markdown: string
): Promise<CategorizedItem & { title: string }> {
  const excerpt = markdown.slice(0, 8000);
  const { text } = await generateText({
    model: getChatModel(),
    maxOutputTokens: 500,
    system: `You are a content classifier. Given a web page URL and excerpt, output exactly:
- title: short page title (from content or URL)
- description: one-line description (max 200 chars)
- suggestedType: one of Product, CaseStudy, Event, SolutionPage, IndustryPlaybook, Pricing, Other
- industry: optional industry tag if evident
- department: optional department/segment if evident
Output valid JSON only, no markdown.`,
    prompt: `URL: ${url}\n\nExcerpt:\n${excerpt}\n\nOutput JSON:`,
  });
  try {
    const parsed = JSON.parse(text.trim().replace(/^```json?\s*|\s*```$/g, ''));
    return {
      title: String(parsed.title ?? url).slice(0, 300),
      description: String(parsed.description ?? '').slice(0, 500),
      suggestedType: String(parsed.suggestedType ?? 'Other'),
      industry: parsed.industry ? String(parsed.industry) : undefined,
      department: parsed.department ? String(parsed.department) : undefined,
    };
  } catch {
    return {
      title: url.replace(/^https?:\/\//, '').slice(0, 300),
      description: '',
      suggestedType: 'Other',
    };
  }
}

export type CategorizedContentItem = {
  url: string;
  title: string;
  description: string;
  suggestedType: string;
  industry?: string;
  department?: string;
};

/** Shape stored in ContentImport.categorizedContent */
export type CategorizedContentPayload = {
  items: CategorizedContentItem[];
};
