import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * Firecrawl agent / structured industry page result shape
 */
type IndustryResultData = {
  introduction?: string;
  introduction_citation?: string;
  use_cases?: string;
  use_cases_citation?: string;
  success_stories?: string;
  success_stories_citation?: string;
  news_and_events?: string;
  news_and_events_citation?: string;
  partners?: string;
  resources?: string;
  getting_started?: string;
  [key: string]: string | undefined;
};

/**
 * POST /api/content-library/import-industry-result
 * Body: { industryName: string, productId: string, data: IndustryResultData }
 * Parses Firecrawl-agent-style JSON into Content Library (SuccessStory, UseCase, FeatureRelease).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { industryName, productId, data } = await req.json();
    if (!industryName || typeof industryName !== 'string') {
      return NextResponse.json({ error: 'industryName is required' }, { status: 400 });
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'data object is required' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: session.user.id },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const raw = data as IndustryResultData;
    const created: { type: string; title: string }[] = [];
    const errors: string[] = [];

    // --- Success stories: "Real‑World Impact:\n- Company: description\n- Company: ..."
    if (raw.success_stories?.trim()) {
      const lines = raw.success_stories
        .replace(/^[\s\S]*?:\s*\n?/m, '') // drop "Real‑World Impact:" header
        .split(/\n+/)
        .map((s) => s.replace(/^[\s\-•*]+\s*/, '').trim())
        .filter(Boolean);
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        const company = colonIdx > 0 ? line.slice(0, colonIdx).trim() : line.slice(0, 50);
        const description = colonIdx > 0 ? line.slice(colonIdx + 1).trim() : line;
        if (!company) continue;
        try {
          await prisma.contentLibrary.create({
            data: {
              userId: session.user.id,
              productId: product.id,
              type: 'SuccessStory',
              title: `${company}: ${description.slice(0, 80)}${description.length > 80 ? '…' : ''}`,
              content: {
                headline: company,
                oneLiner: description.slice(0, 200),
                fullSummary: description,
                company,
                useCase: undefined,
              },
              industry: industryName,
              company,
              sourceUrl: raw.success_stories_citation || undefined,
              userConfirmed: true,
            },
          });
          created.push({ type: 'SuccessStory', title: company });
        } catch (e) {
          errors.push(`Success story "${company}": ${e instanceof Error ? e.message : 'Failed'}`);
        }
      }
    }

    // --- Use cases: sections like "Title\n\nDescription" or "Title\nDescription"
    if (raw.use_cases?.trim()) {
      const blocks = raw.use_cases
        .split(/\n\n+/)
        .map((b) => b.trim())
        .filter((b) => b.length > 20);
      for (const block of blocks) {
        const firstLine = block.split('\n')[0]?.trim() || '';
        const rest = block.slice(firstLine.length).trim().replace(/^\n+/, '');
        const title = firstLine.length > 0 && firstLine.length < 120 ? firstLine : block.slice(0, 100);
        const description = rest || block;
        if (!title) continue;
        try {
          await prisma.contentLibrary.create({
            data: {
              userId: session.user.id,
              productId: product.id,
              type: 'UseCase',
              title,
              content: { valueProp: description, description },
              industry: industryName,
              sourceUrl: raw.use_cases_citation || undefined,
              userConfirmed: true,
            },
          });
          created.push({ type: 'UseCase', title });
        } catch (e) {
          errors.push(`Use case "${title.slice(0, 30)}": ${e instanceof Error ? e.message : 'Failed'}`);
        }
      }
    }

    // --- News and events: bullet list -> FeatureRelease
    if (raw.news_and_events?.trim()) {
      const lines = raw.news_and_events
        .replace(/^[\s\S]*?:\s*\n?/m, '')
        .split(/\n+/)
        .map((s) => s.replace(/^[\s\-•*]+\s*/, '').trim())
        .filter(Boolean);
      for (const line of lines) {
        const title = line.slice(0, 200);
        if (!title) continue;
        try {
          await prisma.contentLibrary.create({
            data: {
              userId: session.user.id,
              productId: product.id,
              type: 'FeatureRelease',
              title,
              content: {
                releaseDate: new Date().toISOString().split('T')[0],
                features: [line],
                benefits: [],
                targetAudience: [],
                relatedProducts: [],
              },
              industry: industryName,
              sourceUrl: raw.news_and_events_citation || undefined,
              userConfirmed: true,
            },
          });
          created.push({ type: 'FeatureRelease', title });
        } catch (e) {
          errors.push(`News "${title.slice(0, 30)}": ${e instanceof Error ? e.message : 'Failed'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      createdByType: {
        SuccessStory: created.filter((c) => c.type === 'SuccessStory').length,
        UseCase: created.filter((c) => c.type === 'UseCase').length,
        FeatureRelease: created.filter((c) => c.type === 'FeatureRelease').length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import industry result error:', error);
    return NextResponse.json(
      { error: 'Failed to import', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
