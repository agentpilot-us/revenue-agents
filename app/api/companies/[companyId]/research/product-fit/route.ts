import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { scoreProductFitForGroup } from '@/lib/research/research-company';
import type { BuyingGroupDetail } from '@/lib/research/company-research-schema';

export const maxDuration = 90;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const enrichedGroups = Array.isArray(body.enrichedGroups) ? body.enrichedGroups : [];

    if (enrichedGroups.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include enrichedGroups (array from Step 2).' },
        { status: 400 }
      );
    }

    const catalogProducts = await prisma.catalogProduct.findMany({
      where: { userId: session.user.id } as { userId: string },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const contentLibraryProducts =
      catalogProducts.length === 0
        ? await prisma.product.findMany({
            where: { userId: session.user.id },
            select: { name: true },
            orderBy: { name: 'asc' },
          })
        : [];
    const productNames =
      catalogProducts.length > 0
        ? catalogProducts.map((p) => p.name)
        : contentLibraryProducts.map((p) => p.name);

    if (productNames.length === 0) {
      return NextResponse.json(
        { error: 'No products found. Add products or catalog products first.' },
        { status: 400 }
      );
    }

    const groups: BuyingGroupDetail[] = [];

    for (const group of enrichedGroups as BuyingGroupDetail[]) {
      const result = await scoreProductFitForGroup(group, productNames);
      if (!result.ok) {
        return NextResponse.json(
          { error: `Product fit failed for group "${group.name}": ${result.error}` },
          { status: 500 }
        );
      }
      groups.push({
        ...group,
        products: result.products,
      });
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/product-fit error:', error);
    const message = error instanceof Error ? error.message : 'Product fit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
