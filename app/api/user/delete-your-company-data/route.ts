import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * DELETE all "your company data" (content library) for the current user.
 * Removes: ContentLibrary (and chunks, schedules), ContentCrawlSchedule, Product,
 * ProductProfile, CatalogProduct (user-scoped), IndustryPlaybook, MessagingFramework.
 * Does not remove: User profile, target companies, or auth data.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Order matters: respect FKs. ContentLibrary first (cascades to chunks + ContentLibrarySchedule).
    const contentLibraryCount = await prisma.contentLibrary.deleteMany({
      where: { userId },
    });

    await prisma.contentCrawlSchedule.deleteMany({
      where: { userId },
    });

    const productCount = await prisma.product.deleteMany({
      where: { userId },
    });

    const profileCount = await prisma.productProfile.deleteMany({
      where: { userId },
    });

    const catalogCount = await prisma.catalogProduct.deleteMany({
      where: { userId },
    });

    const playbookCount = await prisma.industryPlaybook.deleteMany({
      where: { userId },
    });

    const frameworkCount = await prisma.messagingFramework.deleteMany({
      where: { userId },
    });

    const total =
      contentLibraryCount.count +
      productCount.count +
      profileCount.count +
      catalogCount.count +
      playbookCount.count +
      frameworkCount.count;

    return NextResponse.json({
      ok: true,
      deleted: total,
      message: `Deleted all your company data: ${contentLibraryCount.count} content items, ${productCount.count} products, ${catalogCount.count} catalog products, ${profileCount.count} profiles, ${playbookCount.count} industry playbooks, ${frameworkCount.count} messaging frameworks.`,
    });
  } catch (e) {
    console.error('POST /api/user/delete-your-company-data', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
