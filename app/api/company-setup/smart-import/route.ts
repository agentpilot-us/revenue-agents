import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { startCrawl, getCrawlStatus } from '@/lib/tools/firecrawl';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { z } from 'zod';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const bodySchema = z.object({
  website: z.string().url().or(z.string().min(1).transform((s) => (s.startsWith('http') ? s : `https://${s}`))),
  primaryIndustry: z.string().min(1),
  additionalIndustries: z.array(z.string()).optional().default([]),
});

/** Map industry value to URL/path keywords for filtering. */
function industryToKeywords(industry: string): string[] {
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

/** Filter crawl data by URL containing any of the industry keywords. */
function filterByIndustry(
  data: { markdown?: string; metadata?: { sourceURL?: string } }[],
  primaryIndustry: string,
  additionalIndustries: string[]
): { markdown?: string; metadata?: { sourceURL?: string } }[] {
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

/** Categorize a single page with AI. */
async function categorizePage(
  url: string,
  markdown: string
): Promise<{ title: string; description: string; suggestedType: string; industry?: string; department?: string }> {
  const excerpt = markdown.slice(0, 8000);
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.FIRECRAWL_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'Firecrawl is not configured. Add FIRECRAWL_API_KEY to enable smart import.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { website, primaryIndustry, additionalIndustries } = parsed.data;
    const url = website.startsWith('http') ? website : `https://${website}`;

    const results: Array<{
      url: string;
      title: string;
      description: string;
      suggestedType: string;
      industry?: string;
      department?: string;
    }> = [];

    // Step 1: Start crawl
    const crawlResult = await startCrawl({
      url,
      limit: 40,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    });
    if (!crawlResult.ok) {
      return NextResponse.json(
        { error: 'Crawl failed', details: crawlResult.error },
        { status: 502 }
      );
    }

    // Step 2: Poll until completed (max ~2 min)
    const deadline = Date.now() + 120_000;
    let crawlData: { markdown?: string; metadata?: { sourceURL?: string } }[] = [];
    while (Date.now() < deadline) {
      const statusResult = await getCrawlStatus(crawlResult.crawlId);
      if (!statusResult.ok) break;
      if (statusResult.status === 'completed' && statusResult.data?.length) {
        crawlData = statusResult.data;
        break;
      }
      await new Promise((r) => setTimeout(r, 4000));
    }

    if (crawlData.length === 0) {
      return NextResponse.json({
        progress: [
          { step: 1, message: 'Crawl started' },
          { step: 2, message: 'Crawl did not return pages in time. Try a smaller site or run again.' },
        ],
        results: [],
      });
    }

    // Step 3: Filter by industry
    const filtered = filterByIndustry(crawlData, primaryIndustry, additionalIndustries);
    const toProcess = filtered.length > 0 ? filtered : crawlData;
    const limit = Math.min(toProcess.length, 15);

    // Step 4: Categorize each page
    for (let i = 0; i < limit; i++) {
      const item = toProcess[i];
      const pageUrl = item.metadata?.sourceURL ?? url;
      const markdown = item.markdown ?? '';
      const categorized = await categorizePage(pageUrl, markdown);
      results.push({
        url: pageUrl,
        title: categorized.title,
        description: categorized.description,
        suggestedType: categorized.suggestedType,
        industry: categorized.industry,
        department: categorized.department,
      });
    }

    return NextResponse.json({
      progress: [
        { step: 1, message: 'Crawl started' },
        { step: 2, message: `Discovered ${crawlData.length} pages` },
        { step: 3, message: `Filtered to ${filtered.length} industry-related pages` },
        { step: 4, message: `Categorized ${results.length} pages` },
      ],
      results,
    });
  } catch (e) {
    console.error('POST company-setup/smart-import', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Smart import failed' },
      { status: 500 }
    );
  }
}
