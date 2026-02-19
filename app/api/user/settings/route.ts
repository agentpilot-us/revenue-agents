import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        companyWebsite: true,
        companyLogoUrl: true,
        companyIndustry: true,
        primaryIndustrySellTo: true,
        contentRefreshFrequency: true,
        contentRefreshNextAt: true,
        notifyOnNewContent: true,
        notifyOnUpdatedContent: true,
        notifyOnRemovedContent: true,
        nightlyCrawlPreferredHour: true,
        crawlPaused: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/user/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName,
      companyWebsite,
      companyIndustry,
      primaryIndustrySellTo,
      contentRefreshFrequency,
      contentRefreshNextAt,
      notifyOnNewContent,
      notifyOnUpdatedContent,
      notifyOnRemovedContent,
      nightlyCrawlPreferredHour,
      crawlPaused,
    } = body;

    const data: Record<string, unknown> = {};
    if (companyName !== undefined) data.companyName = typeof companyName === 'string' ? (companyName.trim() || null) : null;
    if (companyWebsite !== undefined) data.companyWebsite = typeof companyWebsite === 'string' ? (companyWebsite.trim() || null) : null;
    if (companyIndustry !== undefined) data.companyIndustry = typeof companyIndustry === 'string' ? (companyIndustry.trim() || null) : null;
    if (primaryIndustrySellTo !== undefined) data.primaryIndustrySellTo = typeof primaryIndustrySellTo === 'string' ? (primaryIndustrySellTo.trim() || null) : null;
    if (contentRefreshFrequency !== undefined) data.contentRefreshFrequency = typeof contentRefreshFrequency === 'string' ? (contentRefreshFrequency.trim() || null) : null;
    if (contentRefreshNextAt !== undefined) {
      data.contentRefreshNextAt = contentRefreshNextAt === null || contentRefreshNextAt === '' ? null : (typeof contentRefreshNextAt === 'string' ? new Date(contentRefreshNextAt) : contentRefreshNextAt instanceof Date ? contentRefreshNextAt : undefined);
    }
    if (notifyOnNewContent !== undefined) data.notifyOnNewContent = typeof notifyOnNewContent === 'boolean' ? notifyOnNewContent : undefined;
    if (notifyOnUpdatedContent !== undefined) data.notifyOnUpdatedContent = typeof notifyOnUpdatedContent === 'boolean' ? notifyOnUpdatedContent : undefined;
    if (notifyOnRemovedContent !== undefined) data.notifyOnRemovedContent = typeof notifyOnRemovedContent === 'boolean' ? notifyOnRemovedContent : undefined;
    if (nightlyCrawlPreferredHour !== undefined) {
      const hour = typeof nightlyCrawlPreferredHour === 'number' ? nightlyCrawlPreferredHour : (typeof nightlyCrawlPreferredHour === 'string' ? parseInt(nightlyCrawlPreferredHour, 10) : undefined);
      if (hour !== undefined && !isNaN(hour) && hour >= 0 && hour <= 23) {
        data.nightlyCrawlPreferredHour = hour;
      } else if (nightlyCrawlPreferredHour === null || nightlyCrawlPreferredHour === '') {
        data.nightlyCrawlPreferredHour = null;
      }
    }
    if (crawlPaused !== undefined) data.crawlPaused = typeof crawlPaused === 'boolean' ? crawlPaused : undefined;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        companyWebsite: true,
        companyLogoUrl: true,
        companyIndustry: true,
        primaryIndustrySellTo: true,
        contentRefreshFrequency: true,
        contentRefreshNextAt: true,
        notifyOnNewContent: true,
        notifyOnUpdatedContent: true,
        notifyOnRemovedContent: true,
        nightlyCrawlPreferredHour: true,
        crawlPaused: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('PUT /api/user/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
}
