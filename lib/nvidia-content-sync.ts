/**
 * Content Sync – session catalogs and industry pages
 * Fetches and syncs content from session catalogs (e.g. conference sessions) and
 * industry/solution pages (success stories, product announcements, use cases).
 */

import { scrapeUrl } from './tools/firecrawl';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const gtcSessionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sessionType: z.enum(['Talk', 'Tutorial', 'Panel', 'Workshop', 'Demo', 'Other']).optional(),
  date: z.string().optional(), // ISO date string
  time: z.string().optional(),
  speakers: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(), // AI topics covered
  targetAudience: z.array(z.string()).optional(), // departments/roles
  industries: z.array(z.string()).optional(),
  url: z.string().optional(),
});

const gtcSessionsSchema = z.object({
  sessions: z.array(gtcSessionSchema),
});

/** Generic event from any events page (non-GTC) */
const genericEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  eventType: z.string().optional(), // e.g. webinar, conference, workshop
});

const genericEventsSchema = z.object({
  events: z.array(genericEventSchema),
});

const automotiveContentSchema = z.object({
  successStories: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      description: z.string(),
      useCase: z.string().optional(),
      industry: z.string().default('Automotive'),
      url: z.string().optional(),
    })
  ).optional(),
  productAnnouncements: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      releaseDate: z.string().optional(),
      relatedProducts: z.array(z.string()).optional(),
      url: z.string().optional(),
    })
  ).optional(),
  useCases: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      department: z.string().optional(),
      industry: z.string().default('Automotive'),
    })
  ).optional(),
});

/**
 * Extract industry from session catalog URL if filtered by industry
 * Example: ?industries=Automotive%20%2F%20Transportation -> "Automotive / Transportation"
 */
function extractIndustryFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const industriesParam = urlObj.searchParams.get('industries');
    if (industriesParam) {
      return decodeURIComponent(industriesParam);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scrape and extract sessions from a session catalog URL
 * Sessions are organized by topic/interest. URL can include filters (e.g. ?industries=...)
 */
export async function syncGTCSessions(sessionCatalogUrl?: string): Promise<{
  ok: boolean;
  sessions?: Array<z.infer<typeof gtcSessionSchema>>;
  industry?: string | null; // Extracted from URL if filtered
  error?: string;
}> {
  try {
    const gtcUrl = (sessionCatalogUrl || '').trim();
    if (!gtcUrl) {
      return { ok: false, error: 'Session catalog URL is required' };
    }
    const extractedIndustry = extractIndustryFromUrl(gtcUrl);
    console.log('🌐 Scraping session catalog:', gtcUrl);
    if (extractedIndustry) {
      console.log('📌 Industry filter detected:', extractedIndustry);
    }

    const scrapeResult = await scrapeUrl({ url: gtcUrl, formats: ['markdown'] });
    if (!scrapeResult.ok || !scrapeResult.markdown) {
      return { ok: false, error: scrapeResult.error || 'Failed to scrape session catalog' };
    }

    const markdown = scrapeResult.markdown.slice(0, 80000); // Increased limit for session catalog

    console.log('🤖 Extracting sessions with AI...');

    const { object: extracted } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 12000,
      system: `You are extracting session/event information from a session catalog or events page.
Sessions are organized by TOPIC/INTEREST (e.g., "Autonomous Vehicles", "AI", "Manufacturing", "Healthcare", etc.), NOT by product.

Extract ALL sessions from the catalog. For each session, identify:
- Title and description
- Session type (Talk, Tutorial, Panel, Workshop, Demo, Other)
- Date/time if available
- Speakers/presenters
- PRIMARY TOPIC/INTEREST (main category)
- Additional topics covered
- Target audience (departments/roles)
- Relevant industries
- URL if available

IMPORTANT: The PRIMARY TOPIC/INTEREST is the main way sessions are categorized. Extract this from the catalog structure (categories, filters, tags, or session grouping).

Focus on extracting actionable session information organized by topic/interest so sales teams can recommend relevant sessions to prospects.`,
      prompt: `Extract all sessions from the session catalog. Pay attention to how sessions are categorized by topic/interest:

${markdown}`,
      schema: gtcSessionsSchema,
    });

    console.log(`✅ Extracted ${extracted.sessions.length} sessions`);

    return { ok: true, sessions: extracted.sessions, industry: extractedIndustry };
  } catch (error) {
    console.error('❌ Session catalog sync error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scrape and extract content from industry/solution pages (success stories, announcements, use cases)
 */
export async function syncIndustryContent(
  industryUrl: string,
  industryName: string
): Promise<{
  ok: boolean;
  content?: z.infer<typeof automotiveContentSchema>;
  error?: string;
}> {
  try {
    console.log(`🌐 Scraping ${industryName} content from:`, industryUrl);

    const scrapeResult = await scrapeUrl({ url: industryUrl, formats: ['markdown'] });
    if (!scrapeResult.ok || !scrapeResult.markdown) {
      return { ok: false, error: scrapeResult.error || 'Failed to scrape industry page' };
    }

    const markdown = scrapeResult.markdown.slice(0, 50000);

    console.log(`🤖 Extracting ${industryName} content with AI...`);

    const { object: extracted } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 8000,
      system: `You are extracting structured content from an industry or solution page.
Extract:
1. Success Stories / Case Studies - customer stories with company names, challenges, solutions, results
2. Product Announcements - new product releases, features, updates
3. Use Cases - specific use cases for the industry

For success stories, include company name, title, description, use case, and any URLs.
For product announcements, include title, description, release date, and related products.
For use cases, include title, description, and relevant departments.`,
      prompt: `Extract success stories, product announcements, and use cases from this ${industryName} industry page:

${markdown}`,
      schema: automotiveContentSchema,
    });

    console.log(`✅ Extracted ${industryName} content:`, {
      successStories: extracted.successStories?.length ?? 0,
      productAnnouncements: extracted.productAnnouncements?.length ?? 0,
      useCases: extracted.useCases?.length ?? 0,
    });

    return { ok: true, content: extracted };
  } catch (error) {
    console.error(`❌ ${industryName} content sync error:`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scrape and extract events from an arbitrary URL (non-GTC).
 * Used for "Other events" so they are stored separately from GTC.
 */
export async function syncEventsFromUrl(
  eventsUrl: string,
  eventSourceName: string
): Promise<{
  ok: boolean;
  events?: Array<z.infer<typeof genericEventSchema>>;
  error?: string;
}> {
  try {
    console.log('🌐 Scraping events from:', eventsUrl, 'source:', eventSourceName);

    const scrapeResult = await scrapeUrl({ url: eventsUrl, formats: ['markdown'] });
    if (!scrapeResult.ok || !scrapeResult.markdown) {
      return { ok: false, error: scrapeResult.error || 'Failed to scrape events page' };
    }

    const markdown = scrapeResult.markdown.slice(0, 60000);

    console.log('🤖 Extracting events with AI...');

    const { object: extracted } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      maxOutputTokens: 8000,
      system: `You are extracting event/session information from a web page (conference, webinars, events listing, etc.).
Extract ALL events you can find. For each event include:
- title (required)
- description (optional)
- date (optional, ISO or readable)
- url (registration or detail link if available)
- eventType (optional: e.g. webinar, conference, workshop, talk, panel)

Focus on events that would be useful for inviting contacts to (sessions, webinars, conferences).`,
      prompt: `Extract all events from this page. Event source name: "${eventSourceName}".

${markdown}`,
      schema: genericEventsSchema,
    });

    console.log(`✅ Extracted ${extracted.events.length} events from ${eventSourceName}`);

    return { ok: true, events: extracted.events };
  } catch (error) {
    console.error('❌ Events sync error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper to convert a generic event to ContentLibrary CompanyEvent format (for "Other events")
 */
export function otherEventToCompanyEvent(
  event: z.infer<typeof genericEventSchema>,
  productId: string,
  eventSourceName: string
) {
  return {
    productId,
    title: event.title,
    type: 'CompanyEvent' as const,
    content: {
      eventDate: event.date,
      eventType: (event.eventType || 'other').toLowerCase(),
      description: event.description || event.title,
      registrationUrl: event.url,
      targetAudience: [],
      location: undefined,
      topics: [],
      primaryTopic: eventSourceName,
      speakers: [],
      industries: [],
      eventSource: eventSourceName, // So we can filter GTC vs other events
    },
    department: undefined,
    industry: undefined,
    persona: eventSourceName,
    sourceUrl: event.url,
  };
}

/**
 * Helper to convert GTC session to ContentLibrary CompanyEvent format
 * Sessions are organized by topic/interest, product is optional
 * @param session - GTC session data
 * @param productId - Optional product ID
 * @param urlIndustry - Industry extracted from URL filter (e.g., "Automotive / Transportation")
 */
export function gtcSessionToCompanyEvent(
  session: z.infer<typeof gtcSessionSchema>,
  productId?: string | null,
  urlIndustry?: string | null
) {
  // Primary topic is the first topic, or derive from title/description
  const primaryTopic = session.topics?.[0] || session.title.split(':')[0] || 'GTC Session';
  
  // Use URL industry filter if available, otherwise use session's industries
  const industry = urlIndustry || session.industries?.[0] || undefined;
  
  return {
    productId: productId || undefined, // Optional - sessions are topic-based, not product-based
    title: session.title,
    type: 'CompanyEvent' as const,
    content: {
      eventDate: session.date || undefined,
      eventType: session.sessionType?.toLowerCase() || 'other',
      description: session.description || session.title,
      registrationUrl: session.url,
      targetAudience: session.targetAudience || [],
      location: 'San Jose, CA', // GTC is typically in San Jose
      topics: session.topics || [],
      primaryTopic: primaryTopic, // Main topic/interest category
      speakers: session.speakers || [],
      industries: session.industries || [],
      eventSource: 'GTC', // So we can filter GTC only vs other events
    },
    // Use primary topic as department for filtering/organization
    department: primaryTopic || session.targetAudience?.[0]?.split(' ').pop() || undefined,
    industry: industry, // Use URL-filtered industry if available
    // Store primary topic in persona field for topic-based filtering
    persona: primaryTopic,
    sourceUrl: session.url,
  };
}

/**
 * Helper to convert success story to ContentLibrary SuccessStory format
 */
type SuccessStoryItem = NonNullable<
  z.infer<typeof automotiveContentSchema>['successStories']
>[number];

export function successStoryToContentLibrary(
  story: SuccessStoryItem,
  productId: string
) {
  return {
    productId,
    title: `${story.company}: ${story.title}`,
    type: 'SuccessStory' as const,
    content: {
      headline: story.title,
      oneLiner: story.description.slice(0, 200),
      fullSummary: story.description,
      company: story.company,
      useCase: story.useCase,
    },
    industry: story.industry,
    company: story.company,
    sourceUrl: story.url,
  };
}

/**
 * Helper to convert product announcement to ContentLibrary FeatureRelease format
 */
type ProductAnnouncementItem = NonNullable<
  z.infer<typeof automotiveContentSchema>['productAnnouncements']
>[number];

export function productAnnouncementToFeatureRelease(
  announcement: ProductAnnouncementItem,
  productId: string
) {
  return {
    productId,
    title: announcement.title,
    type: 'FeatureRelease' as const,
    content: {
      releaseDate: announcement.releaseDate || new Date().toISOString().split('T')[0],
      features: announcement.description.split('.').filter(Boolean),
      benefits: [],
      targetAudience: [],
      relatedProducts: announcement.relatedProducts || [],
    },
    sourceUrl: announcement.url,
  };
}
