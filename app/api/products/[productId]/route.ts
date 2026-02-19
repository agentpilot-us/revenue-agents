import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';
import { z } from 'zod';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
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

  const product = await prisma.catalogProduct.findFirst({
    where: { id: productId, userId: session.user.id },
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
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.priceMin !== undefined) updateData.priceMin = validated.priceMin;
    if (validated.priceMax !== undefined) updateData.priceMax = validated.priceMax;
    if (validated.pricingModel !== undefined) updateData.pricingModel = validated.pricingModel;
    if (validated.targetDepartments !== undefined) updateData.targetDepartments = validated.targetDepartments;
    if (validated.targetPersonas !== undefined) updateData.targetPersonas = validated.targetPersonas;
    if (validated.useCases !== undefined) updateData.useCases = validated.useCases;
    if (validated.contentTags !== undefined) updateData.contentTags = validated.contentTags;

    if (validated.name !== undefined) {
      const baseSlug = slugify(validated.name) || 'product';
      let slug = baseSlug;
      let suffix = 1;
      let exists = await prisma.catalogProduct.findFirst({
        where: { userId: session.user.id, slug },
      });
      if (exists && exists.id !== productId) {
        while (exists) {
          slug = `${baseSlug}-${suffix}`;
          exists = await prisma.catalogProduct.findFirst({
            where: { userId: session.user.id, slug },
          });
          if (!exists || exists.id === productId) break;
          suffix++;
        }
      }
      if (!exists || exists.id === productId) updateData.slug = slug;
    }

    const product = await prisma.catalogProduct.updateMany({
      where: { id: productId, userId: session.user.id },
      data: updateData,
    });
    if (product.count === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const updated = await prisma.catalogProduct.findUnique({
      where: { id: productId },
    });

    return NextResponse.json(updated);
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
          { error: 'A product with this name already exists' },
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
