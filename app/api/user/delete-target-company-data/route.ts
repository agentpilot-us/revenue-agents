import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * DELETE all target company data for the current user.
 * Removes all Companies (target accounts) owned by the user. Cascades remove:
 * CompanyDepartments, Contacts, SegmentCampaigns, and other company-linked records.
 * Does not remove: User profile, CatalogProducts, ContentLibrary, Product, ProductProfile (your company data).
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const count = await prisma.company.count({
      where: { userId },
    });

    await prisma.company.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      ok: true,
      deleted: count,
      message: `Deleted ${count} target compan${count === 1 ? 'y' : 'ies'} and all related contacts, departments, and campaigns.`,
    });
  } catch (e) {
    console.error('POST /api/user/delete-target-company-data', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
