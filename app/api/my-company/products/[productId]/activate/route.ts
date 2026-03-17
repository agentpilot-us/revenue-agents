import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;
    const userId = session.user.id;

    const companyProduct = await prisma.companyProduct.findFirst({
      where: {
        id: productId,
        company: { userId },
      },
      select: {
        id: true,
        status: true,
        opportunitySize: true,
        companyId: true,
        company: { select: { name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!companyProduct) {
      return NextResponse.json({ error: 'Product not found for this user' }, { status: 404 });
    }

    const title = `Activate product: ${companyProduct.product.name}`;
    const summary = `Track ${companyProduct.product.name} for account ${
      companyProduct.company.name
    } as a first-class trigger. Status: ${
      companyProduct.status
    }. Potential: ${companyProduct.opportunitySize ?? 'n/a'}.`;

    const signal = await prisma.accountSignal.create({
      data: {
        companyId: companyProduct.companyId,
        userId,
        type: 'internal_product_trigger',
        title,
        summary,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 7,
        suggestedPlay: 'new_buying_group',
      },
    });

    const playRunIds = await autoCreateProductPlayRuns(userId, companyProduct.product.name);

    return NextResponse.json({ ok: true, signalId: signal.id, playRunsCreated: playRunIds.length });
  } catch (error) {
    console.error('POST /api/my-company/products/[productId]/activate error:', error);
    return NextResponse.json({ error: 'Failed to activate product trigger' }, { status: 500 });
  }
}

async function autoCreateProductPlayRuns(userId: string, productName: string): Promise<string[]> {
  const template = await prisma.playTemplate.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { triggerType: 'SIGNAL' },
        { name: { contains: 'Product Announcement', mode: 'insensitive' } },
        { name: { contains: 'Feature', mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  if (!template) return [];

  const companies = await prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const playRunIds: string[] = [];
  for (const company of companies) {
    try {
      const playRun = await createPlayRunFromTemplate({
        userId,
        companyId: company.id,
        playTemplateId: template.id,
        title: `${productName} Launch — ${company.name}`,
      });
      playRunIds.push(playRun.id);
    } catch {
      console.warn(`Skipped play run for ${company.name}: create failed`);
    }
  }
  return playRunIds;
}
