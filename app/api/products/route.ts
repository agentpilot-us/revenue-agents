import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  pricingModel: z.string().optional(),
  targetDepartments: z.array(z.nativeEnum(DepartmentType)).default([]),
  targetPersonas: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
  contentTags: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = await prisma.catalogProduct.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createProductSchema.parse(body);

    const product = await prisma.catalogProduct.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        priceMin: validated.priceMin,
        priceMax: validated.priceMax,
        pricingModel: validated.pricingModel,
        targetDepartments: validated.targetDepartments,
        targetPersonas: validated.targetPersonas,
        useCases: validated.useCases,
        contentTags: validated.contentTags,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A product with this name or slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
