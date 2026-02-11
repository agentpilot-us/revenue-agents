import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional().nullable(),
  priceMin: z.number().optional().nullable(),
  priceMax: z.number().optional().nullable(),
  pricingModel: z.string().optional().nullable(),
  targetDepartments: z.array(z.nativeEnum(DepartmentType)).optional(),
  targetPersonas: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  contentTags: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await params;

  const product = await prisma.catalogProduct.findUnique({
    where: { id: productId },
    include: {
      companyProducts: {
        include: {
          company: true,
          companyDepartment: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;
    const body = await req.json();
    const validated = updateProductSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.slug !== undefined) updateData.slug = validated.slug;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.priceMin !== undefined) updateData.priceMin = validated.priceMin;
    if (validated.priceMax !== undefined) updateData.priceMax = validated.priceMax;
    if (validated.pricingModel !== undefined) updateData.pricingModel = validated.pricingModel;
    if (validated.targetDepartments !== undefined) updateData.targetDepartments = validated.targetDepartments;
    if (validated.targetPersonas !== undefined) updateData.targetPersonas = validated.targetPersonas;
    if (validated.useCases !== undefined) updateData.useCases = validated.useCases;
    if (validated.contentTags !== undefined) updateData.contentTags = validated.contentTags;

    const product = await prisma.catalogProduct.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A product with this name or slug already exists' },
          { status: 409 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}
