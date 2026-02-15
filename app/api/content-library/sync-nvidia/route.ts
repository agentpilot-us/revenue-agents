import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  syncGTCSessions,
  syncIndustryContent,
  syncEventsFromUrl,
  gtcSessionToCompanyEvent,
  otherEventToCompanyEvent,
  successStoryToContentLibrary,
  productAnnouncementToFeatureRelease,
} from '@/lib/nvidia-content-sync';

/**
 * POST /api/content-library/sync-nvidia
 * Sync content: GTC sessions (GTC only), industry pages (tagged by industry name), or other events (separate URL).
 *
 * Body: { type: 'gtc' | 'industry' | 'other-events', sessionCatalogUrl?, industryUrl?, industryName?, productId?, eventsUrl?, eventSourceName? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, industryUrl, industryName, sessionCatalogUrl, eventsUrl, eventSourceName } = body;
    let productId: string | undefined = body.productId;

    // productId for industry is optional; we will create/find a default product if missing
    if (type === 'gtc' && !sessionCatalogUrl) {
      return NextResponse.json({ error: 'sessionCatalogUrl is required for GTC sessions' }, { status: 400 });
    }
    if (type === 'other-events' && !eventsUrl) {
      return NextResponse.json({ error: 'eventsUrl is required for other events' }, { status: 400 });
    }

    // Verify product belongs to user (if provided)
    let product: { id: string } | null = null;
    if (productId) {
      product = await prisma.product.findFirst({
        where: { id: productId, userId: session.user.id },
        select: { id: true },
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    // For GTC sessions without a product, create or find a default "GTC Sessions" product
    if (type === 'gtc' && !productId) {
      let gtcProduct = await prisma.product.findFirst({
        where: { userId: session.user.id, name: 'GTC Sessions' },
        select: { id: true },
      });
      if (!gtcProduct) {
        gtcProduct = await prisma.product.create({
          data: {
            userId: session.user.id,
            name: 'GTC Sessions',
            description: 'Conference / event sessions',
            category: 'Events',
          },
          select: { id: true },
        });
      }
      product = gtcProduct;
    }

    // For industry without a product, create or find a default "Industry Content" product
    if (type === 'industry' && !productId) {
      let industryProduct = await prisma.product.findFirst({
        where: { userId: session.user.id, name: 'Industry Content' },
        select: { id: true },
      });
      if (!industryProduct) {
        industryProduct = await prisma.product.create({
          data: {
            userId: session.user.id,
            name: 'Industry Content',
            description: 'Content from industry/solution pages',
            category: 'Industry',
          },
          select: { id: true },
        });
      }
      product = industryProduct;
      productId = industryProduct.id;
    }

    // For other events, create or find a product by event source name (default "Events")
    if (type === 'other-events') {
      const sourceName = eventSourceName?.trim() || 'Events';
      let eventsProduct = await prisma.product.findFirst({
        where: { userId: session.user.id, name: sourceName },
        select: { id: true },
      });
      if (!eventsProduct) {
        eventsProduct = await prisma.product.create({
          data: {
            userId: session.user.id,
            name: sourceName,
            description: `Events from ${eventsUrl}`,
            category: 'Events',
          },
          select: { id: true },
        });
      }
      product = eventsProduct;
    }

    let synced = 0;
    let errors: string[] = [];

    if (type === 'gtc') {
      // Sync sessions from session catalog (can be filtered by industry via URL)
      const result = await syncGTCSessions(sessionCatalogUrl);
      if (!result.ok || !result.sessions) {
        return NextResponse.json(
          { error: result.error || 'Failed to sync sessions' },
          { status: 500 }
        );
      }

      // Extract industry from URL if filtered (e.g., ?industries=Automotive%20%2F%20Transportation)
      const urlIndustry = result.industry;

      // Save each session as CompanyEvent (organized by topic/interest, not product)
      for (const gtcSession of result.sessions) {
        try {
          const eventData = gtcSessionToCompanyEvent(gtcSession, product?.id, urlIndustry);
          
          // Check if event already exists (by title + sourceUrl, product is optional)
          const existing = await prisma.contentLibrary.findFirst({
            where: {
              userId: session.user.id,
              ...(product?.id && { productId: product.id }),
              type: 'CompanyEvent',
              title: eventData.title,
              sourceUrl: eventData.sourceUrl || undefined,
            },
          });

          if (existing) {
            // Update existing
            await prisma.contentLibrary.update({
              where: { id: existing.id },
              data: {
                content: eventData.content,
                department: eventData.department,
                industry: eventData.industry,
                persona: eventData.persona, // Store primary topic here for filtering
                sourceUrl: eventData.sourceUrl,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new (product is always set in gtc branch)
            const createProductId = eventData.productId ?? product?.id;
            if (!createProductId) {
              errors.push(`Skipped "${gtcSession.title}": no product`);
              continue;
            }
            await prisma.contentLibrary.create({
              data: {
                userId: session.user.id,
                ...eventData,
                productId: createProductId,
                userConfirmed: true,
                scrapedAt: new Date(),
              },
            });
          }
          synced++;
        } catch (error) {
          errors.push(`Failed to save session "${gtcSession.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'industry') {
      // Sync industry content
      if (!industryUrl || !industryName) {
        return NextResponse.json(
          { error: 'industryUrl and industryName are required for industry sync' },
          { status: 400 }
        );
      }

      const result = await syncIndustryContent(industryUrl, industryName);
      if (!result.ok || !result.content) {
        return NextResponse.json(
          { error: result.error || 'Failed to sync industry content' },
          { status: 500 }
        );
      }

      // Save success stories (product is set in industry branch)
      const industryProductId = productId ?? product?.id;
      if (result.content.successStories && industryProductId) {
        for (const story of result.content.successStories) {
          try {
            const storyData = successStoryToContentLibrary(story, industryProductId);
            
            const existing = await prisma.contentLibrary.findFirst({
              where: {
                userId: session.user.id,
                productId: industryProductId,
                type: 'SuccessStory',
                title: storyData.title,
                company: storyData.company,
              },
            });

            if (existing) {
              await prisma.contentLibrary.update({
                where: { id: existing.id },
                data: {
                  content: storyData.content,
                  industry: industryName, // Tag with user's industry so content is clearly categorized
                  company: storyData.company,
                  sourceUrl: storyData.sourceUrl,
                  updatedAt: new Date(),
                },
              });
            } else {
              await prisma.contentLibrary.create({
                data: {
                  userId: session.user.id,
                  ...storyData,
                  industry: industryName, // Tag with user's industry so content is clearly categorized
                  userConfirmed: true,
                  scrapedAt: new Date(),
                },
              });
            }
            synced++;
          } catch (error) {
            errors.push(`Failed to save story "${story.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Save product announcements (tag with user's industry name)
      if (result.content.productAnnouncements && industryProductId) {
        for (const announcement of result.content.productAnnouncements) {
          try {
            const releaseData = productAnnouncementToFeatureRelease(announcement, industryProductId);

            const existing = await prisma.contentLibrary.findFirst({
              where: {
                userId: session.user.id,
                productId: industryProductId,
                type: 'FeatureRelease',
                title: releaseData.title,
                sourceUrl: releaseData.sourceUrl || undefined,
              },
            });

            if (existing) {
              await prisma.contentLibrary.update({
                where: { id: existing.id },
                data: {
                  content: releaseData.content,
                  industry: industryName,
                  sourceUrl: releaseData.sourceUrl,
                  updatedAt: new Date(),
                },
              });
            } else {
              await prisma.contentLibrary.create({
                data: {
                  userId: session.user.id,
                  ...releaseData,
                  industry: industryName,
                  userConfirmed: true,
                  scrapedAt: new Date(),
                },
              });
            }
            synced++;
          } catch (error) {
            errors.push(`Failed to save announcement "${announcement.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    } else if (type === 'other-events') {
      const sourceName = eventSourceName?.trim() || 'Events';
      const result = await syncEventsFromUrl(eventsUrl, sourceName);
      if (!result.ok || !result.events) {
        return NextResponse.json(
          { error: result.error || 'Failed to sync events from URL' },
          { status: 500 }
        );
      }

      if (!product?.id) {
        return NextResponse.json({ error: 'Product not found for other events' }, { status: 500 });
      }

      for (const evt of result.events) {
        try {
          const eventData = otherEventToCompanyEvent(evt, product.id, sourceName);

          const existing = await prisma.contentLibrary.findFirst({
            where: {
              userId: session.user.id,
              productId: product.id,
              type: 'CompanyEvent',
              title: eventData.title,
              sourceUrl: eventData.sourceUrl || undefined,
            },
          });

          if (existing) {
            await prisma.contentLibrary.update({
              where: { id: existing.id },
              data: {
                content: eventData.content,
                department: eventData.department,
                industry: eventData.industry,
                persona: eventData.persona,
                sourceUrl: eventData.sourceUrl,
                updatedAt: new Date(),
              },
            });
          } else {
            await prisma.contentLibrary.create({
              data: {
                userId: session.user.id,
                ...eventData,
                userConfirmed: true,
                scrapedAt: new Date(),
              },
            });
          }
          synced++;
        } catch (error) {
          errors.push(`Failed to save event "${evt.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "gtc", "industry", or "other-events"' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      synced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Content sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
