/**
 * Content Library – Firecrawl integration workflows.
 * Maps Firecrawl scrape/crawl/extract to Content Library sections:
 * - Use Cases (scrape use-case pages)
 * - Success Stories / Case Studies (crawl case study pages)
 * - Events (scrape events pages – also in content sync)
 * - Frameworks (extract from docs with schema)
 */

import { scrapeUrl, startCrawl, getCrawlStatus, extract, search } from '@/lib/tools/firecrawl';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ----- Use Cases (Section 3): scrape URL → extract use cases -----

const useCaseItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  benefits: z.array(z.string()).optional(),
  targetDepartment: z.string().optional(),
  industry: z.string().optional(),
});

const useCasesExtractionSchema = z.object({
  useCases: z.array(useCaseItemSchema),
});

export type UseCaseForLibrary = {
  title: string;
  type: 'UseCase';
  content: {
    name: string;
    description: string;
    benefits?: string[];
    targetDepartment?: string;
  };
  industry?: string;
  department?: string;
  sourceUrl: string;
};

export async function importUseCasesFromUrl(
  url: string
): Promise<{ ok: true; items: UseCaseForLibrary[] } | { ok: false; error: string }> {
  const scrapeResult = await scrapeUrl({
    url,
    formats: ['markdown'],
    onlyMainContent: true,
  });
  if (!scrapeResult.ok || !scrapeResult.markdown) {
    return { ok: false, error: (scrapeResult as { error?: string }).error ?? 'Scrape failed' };
  }

  const markdown = scrapeResult.markdown.slice(0, 30000);
  const { object: extracted } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    maxOutputTokens: 4000,
    system: `Extract industry-specific use cases from a company's use-case or solutions page.
Each use case should have: name, description, optional benefits, targetDepartment, industry.
Return all use cases you can find.`,
    prompt: `Extract all use cases from this page:\n\n${markdown}`,
    schema: useCasesExtractionSchema,
  });

  const items: UseCaseForLibrary[] = (extracted.useCases ?? []).map((uc) => ({
    title: uc.name,
    type: 'UseCase' as const,
    content: {
      name: uc.name,
      description: uc.description,
      benefits: uc.benefits,
      targetDepartment: uc.targetDepartment,
    },
    industry: uc.industry ?? undefined,
    department: uc.targetDepartment ?? undefined,
    sourceUrl: url,
  }));

  return { ok: true, items };
}

// ----- Success Stories / Case Studies (Section 4): crawl → extract per page -----

const caseStudyItemSchema = z.object({
  company: z.string(),
  title: z.string(),
  challenge: z.string().optional(),
  solution: z.string().optional(),
  results: z.array(z.string()).optional(),
  industry: z.string().optional(),
  useCase: z.string().optional(),
});

const caseStudyExtractionSchema = z.object({
  caseStudies: z.array(caseStudyItemSchema),
});

export type SuccessStoryForLibrary = {
  title: string;
  type: 'SuccessStory';
  content: {
    headline: string;
    oneLiner: string;
    fullSummary: string;
    company: string;
    useCase?: string;
    challenge?: string;
    solution?: string;
    results?: string[];
  };
  industry?: string;
  company?: string;
  sourceUrl: string;
};

/** Start a crawl for case study pages. Returns crawlId for polling or webhook. */
export async function startCaseStudiesCrawl(params: {
  url: string;
  limit?: number;
  includePaths?: string[];
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<
  | { ok: true; crawlId: string; url: string }
  | { ok: false; error: string }
> {
  return startCrawl({
    url: params.url,
    limit: params.limit ?? 100,
    includePaths: params.includePaths ?? ['/customers', '/case-studies', '/customer-stories', '/success-stories'],
    scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    webhook: params.webhookUrl
      ? {
          url: params.webhookUrl,
          events: ['page', 'completed'],
          metadata: params.metadata,
        }
      : undefined,
  });
}

/** Process crawl result pages: extract case studies from each page's markdown and return items. */
export async function parseCaseStudiesFromCrawlPages(
  pages: { markdown?: string; metadata?: { sourceURL?: string } }[]
): Promise<SuccessStoryForLibrary[]> {
  const items: SuccessStoryForLibrary[] = [];
  for (const page of pages) {
    const markdown = page.markdown;
    const sourceUrl = page.metadata?.sourceURL ?? '';
    if (!markdown || markdown.length < 200) continue;

    const text = markdown.slice(0, 15000);
    try {
      const { object: extracted } = await generateObject({
        model: anthropic('claude-sonnet-4-20250514'),
        maxOutputTokens: 2000,
        system: `Extract customer success stories / case studies from this page.
Return company name, title, challenge, solution, results, industry, use case.
If the page contains multiple stories, return all. If it's a single story, return one.`,
        prompt: text,
        schema: caseStudyExtractionSchema,
      });

      for (const cs of extracted.caseStudies ?? []) {
        const oneLiner = [cs.challenge, cs.solution, cs.results?.[0]].filter(Boolean).join(' ').slice(0, 200);
        items.push({
          title: `${cs.company}: ${cs.title}`,
          type: 'SuccessStory',
          content: {
            headline: cs.title,
            oneLiner: oneLiner || cs.title,
            fullSummary: [cs.challenge, cs.solution, cs.results?.join(' ')].filter(Boolean).join('\n\n'),
            company: cs.company,
            useCase: cs.useCase,
            challenge: cs.challenge,
            solution: cs.solution,
            results: cs.results,
          },
          industry: cs.industry,
          company: cs.company,
          sourceUrl: sourceUrl ?? '',
        });
      }
    } catch {
      // Skip page on extract failure
    }
  }
  return items;
}

/** Poll crawl until completed (or timeout), then parse and return case study items. */
export async function crawlAndParseCaseStudies(params: {
  url: string;
  limit?: number;
  includePaths?: string[];
  pollMaxMs?: number;
}): Promise<
  | { ok: true; items: SuccessStoryForLibrary[]; crawlId: string }
  | { ok: false; error: string; crawlId?: string }
> {
  const start = startCaseStudiesCrawl({
    url: params.url,
    limit: params.limit ?? 50,
    includePaths: params.includePaths,
  });
  const started = await start;
  if (!started.ok) return started;

  const pollMaxMs = params.pollMaxMs ?? 120_000; // 2 min
  const pollIntervalMs = 8000;
  let elapsed = 0;

  while (elapsed < pollMaxMs) {
    const status = await getCrawlStatus(started.crawlId);
    if (!status.ok) return { ok: false, error: status.error, crawlId: started.crawlId };
    if (status.status === 'completed' && status.data?.length) {
      const items = await parseCaseStudiesFromCrawlPages(status.data);
      return { ok: true, items, crawlId: started.crawlId };
    }
    if (status.status === 'failed') {
      return { ok: false, error: 'Crawl failed', crawlId: started.crawlId };
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    elapsed += pollIntervalMs;
  }

  return {
    ok: false,
    error: 'Crawl did not complete in time. Use webhook or check crawl status later.',
    crawlId: started.crawlId,
  };
}

// ----- Frameworks (Section 6): extract with schema -----

const frameworkExtractSchema = {
  type: 'object' as const,
  properties: {
    frameworks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          framework_name: { type: 'string' },
          use_case: { type: 'string' },
          stages: { type: 'array', items: { type: 'string' } },
          talking_points: { type: 'array', items: { type: 'string' } },
          value_props: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

export type FrameworkForLibrary = {
  title: string;
  type: 'Framework';
  content: {
    framework_name: string;
    use_case?: string;
    stages?: string[];
    talking_points?: string[];
    value_props?: string[];
  };
  sourceUrl?: string;
};

export async function extractFrameworksFromUrls(
  urls: string[]
): Promise<{ ok: true; items: FrameworkForLibrary[] } | { ok: false; error: string }> {
  const result = await extract({
    urls,
    schema: frameworkExtractSchema,
    prompt: `Extract sales frameworks and messaging guides from these pages.
For each framework identify: framework_name, use_case, stages (e.g. MEDDIC stages), talking_points, value_props.`,
    scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
  });

  if (!result.ok) return result;

  const data = result.data as { frameworks?: Array<{
    framework_name?: string;
    use_case?: string;
    stages?: string[];
    talking_points?: string[];
    value_props?: string[];
  }> } | undefined;
  const frameworks = Array.isArray(data?.frameworks) ? data.frameworks : [];

  const items: FrameworkForLibrary[] = frameworks
    .filter((f) => f?.framework_name)
    .map((f) => ({
      title: f.framework_name!,
      type: 'Framework' as const,
      content: {
        framework_name: f.framework_name!,
        use_case: f.use_case,
        stages: f.stages,
        talking_points: f.talking_points,
        value_props: f.value_props,
      },
      sourceUrl: urls[0],
    }));

  return { ok: true, items };
}

// ----- Events (Section 5): search → scrape → extract events -----

const eventItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  eventType: z.string().optional(),
});

const eventsExtractionSchema = z.object({
  events: z.array(eventItemSchema),
});

export type EventForLibrary = {
  title: string;
  type: 'CompanyEvent';
  content: {
    eventDate?: string;
    eventType: string;
    description: string;
    registrationUrl?: string;
    targetAudience: string[];
    topics: string[];
    primaryTopic?: string;
    eventSource: string;
  };
  sourceUrl?: string;
  persona?: string;
};

/**
 * Search the web for events (e.g. "Salesforce events 2026", "Conference sessions 2026")
 * and optionally scrape each result to extract structured events into Content Library.
 */
export async function searchEventsForContentLibrary(params: {
  query: string;
  limit?: number;
  scrape?: boolean;
  eventSourceName: string;
}): Promise<{ ok: true; items: EventForLibrary[] } | { ok: false; error: string }> {
  const searchResult = await search({
    query: params.query,
    limit: params.limit ?? 10,
    scrape: params.scrape ?? true,
  });
  if (!searchResult.ok) return searchResult;

  const items: EventForLibrary[] = [];
  const sourceName = params.eventSourceName || 'Events';

  for (const page of searchResult.web) {
    const text = page.markdown ?? [page.title, page.description].filter(Boolean).join('\n');
    if (!text || text.length < 50) continue;

    try {
      const { object: extracted } = await generateObject({
        model: anthropic('claude-sonnet-4-20250514'),
        maxOutputTokens: 2000,
        system: `Extract event/session information from search result content (conferences, webinars, sessions).
For each event include: title (required), description, date (if present), url (registration or detail), eventType (e.g. conference, webinar, session).`,
        prompt: `Extract all events from this content. Source: ${sourceName}\n\n${text.slice(0, 12000)}`,
        schema: eventsExtractionSchema,
      });

      for (const evt of extracted.events ?? []) {
        items.push({
          title: evt.title,
          type: 'CompanyEvent',
          content: {
            eventDate: evt.date,
            eventType: (evt.eventType || 'other').toLowerCase(),
            description: evt.description || evt.title,
            registrationUrl: evt.url,
            targetAudience: [],
            topics: [],
            primaryTopic: sourceName,
            eventSource: sourceName,
          },
          sourceUrl: evt.url || page.url,
          persona: sourceName,
        });
      }
    } catch {
      // Skip page on extract failure
    }
  }

  return { ok: true, items };
}
