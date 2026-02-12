import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ProductOwnershipStatus } from '@prisma/client';
import { z } from 'zod';

const upsertCompanyProductSchema = z.object({
  companyDepartmentId: z.string(),
  productId: z.string(),
  status: z.nativeEnum(ProductOwnershipStatus).optional().default(ProductOwnershipStatus.OPPORTUNITY),
  fitReasoning: z.string().optional().nullable(),
  opportunitySize: z.number().optional().nullable(),
  fitScore: z.number().optional().nullable(),
});

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
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = upsertCompanyProductSchema.parse(body);

    const department = await prisma.companyDepartment.findFirst({
      where: {
        id: validated.companyDepartmentId,
        companyId,
      },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const product = await prisma.catalogProduct.findFirst({
      where: { id: validated.productId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const companyProduct = await prisma.companyProduct.upsert({
      where: {
        companyId_companyDepartmentId_productId: {
          companyId,
          companyDepartmentId: validated.companyDepartmentId,
          productId: validated.productId,
        },
      },
      update: {
        status: validated.status,
        ...(validated.fitReasoning !== undefined && { fitReasoning: validated.fitReasoning }),
        ...(validated.opportunitySize !== undefined && { opportunitySize: validated.opportunitySize }),
        ...(validated.fitScore !== undefined && { fitScore: validated.fitScore }),
      },
      create: {
        companyId,
        companyDepartmentId: validated.companyDepartmentId,
        productId: validated.productId,
        status: validated.status,
        fitReasoning: validated.fitReasoning ?? null,
        opportunitySize: validated.opportunitySize ?? null,
        fitScore: validated.fitScore ?? null,
      },
      include: {
        product: { select: { name: true, slug: true } },
        companyDepartment: { select: { type: true, customName: true } },
      },
    });

    return NextResponse.json(companyProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create or update company product' },
      { status: 500 }
    );
  }
}
