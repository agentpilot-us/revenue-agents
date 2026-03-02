import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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

    const companyProduct = await prisma.companyProduct.findFirst({
      where: {
        id: productId,
        company: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        status: true,
        opportunitySize: true,
        companyId: true,
        company: { select: { name: true } },
        product: { select: { name: true } },
      },
    });

    if (!companyProduct) {
      return NextResponse.json(
        { error: 'Product not found for this user' },
        { status: 404 }
      );
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
        userId: session.user.id,
        type: 'internal_product_trigger',
        title,
        summary,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 7,
        suggestedPlay: 'new_buying_group',
      },
    });

    return NextResponse.json({ ok: true, signalId: signal.id });
  } catch (error) {
    console.error(
      'POST /api/my-company/products/[productId]/activate error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to activate product trigger' },
      { status: 500 }
    );
  }
}

