import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const putBodySchema = z.object({
  oneLiner: z.string().optional().nullable(),
  elevatorPitch: z.string().optional().nullable(),
  valueProps: z.array(z.string()).optional().nullable(),
  painPoints: z.array(z.string()).optional().nullable(),
  bestForDepartments: z.array(z.string()).optional().nullable(),
  bestForIndustries: z.array(z.string()).optional().nullable(),
  technicalRequirements: z.array(z.string()).optional().nullable(),
  objectionHandlers: z
    .array(z.object({ objection: z.string(), response: z.string() }))
    .optional()
    .nullable(),
  competitivePositioning: z.array(z.string()).optional().nullable(),
  linkedCaseStudyIds: z.array(z.string()).optional().nullable(),
  priceRangeText: z.string().optional().nullable(),
  dealSizeSweetSpot: z.string().optional().nullable(),
  salesCycle: z.string().optional().nullable(),
  deployment: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ catalogProductId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { catalogProductId } = await params;

    const catalogProduct = await prisma.catalogProduct.findUnique({
      where: { id: catalogProductId },
      select: { id: true, name: true },
    });
    if (!catalogProduct) {
      return NextResponse.json({ error: 'Catalog product not found' }, { status: 404 });
    }

    const profile = await prisma.productProfile.findUnique({
      where: {
        catalogProductId_userId: { catalogProductId, userId: session.user.id },
      },
      include: { catalogProduct: { select: { name: true } } },
    });

    if (!profile) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({
      id: profile.id,
      catalogProductId: profile.catalogProductId,
      catalogProductName: profile.catalogProduct.name,
      oneLiner: profile.oneLiner,
      elevatorPitch: profile.elevatorPitch,
      valueProps: profile.valueProps as string[] | null,
      painPoints: profile.painPoints as string[] | null,
      bestForDepartments: profile.bestForDepartments as string[] | null,
      bestForIndustries: profile.bestForIndustries as string[] | null,
      technicalRequirements: profile.technicalRequirements as string[] | null,
      objectionHandlers: profile.objectionHandlers as unknown[] | null,
      competitivePositioning: profile.competitivePositioning as string[] | null,
      linkedCaseStudyIds: profile.linkedCaseStudyIds as string[] | null,
      priceRangeText: profile.priceRangeText,
      dealSizeSweetSpot: profile.dealSizeSweetSpot,
      salesCycle: profile.salesCycle,
      deployment: profile.deployment,
      updatedAt: profile.updatedAt,
    });
  } catch (e) {
    console.error('GET catalog-products profile', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ catalogProductId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { catalogProductId } = await params;

    const catalogProduct = await prisma.catalogProduct.findUnique({
      where: { id: catalogProductId },
      select: { id: true },
    });
    if (!catalogProduct) {
      return NextResponse.json({ error: 'Catalog product not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = putBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = {
      oneLiner: parsed.data.oneLiner ?? undefined,
      elevatorPitch: parsed.data.elevatorPitch ?? undefined,
      valueProps: parsed.data.valueProps ?? undefined,
      painPoints: parsed.data.painPoints ?? undefined,
      bestForDepartments: parsed.data.bestForDepartments ?? undefined,
      bestForIndustries: parsed.data.bestForIndustries ?? undefined,
      technicalRequirements: parsed.data.technicalRequirements ?? undefined,
      objectionHandlers: parsed.data.objectionHandlers ?? undefined,
      competitivePositioning: parsed.data.competitivePositioning ?? undefined,
      linkedCaseStudyIds: parsed.data.linkedCaseStudyIds ?? undefined,
      priceRangeText: parsed.data.priceRangeText ?? undefined,
      dealSizeSweetSpot: parsed.data.dealSizeSweetSpot ?? undefined,
      salesCycle: parsed.data.salesCycle ?? undefined,
      deployment: parsed.data.deployment ?? undefined,
    };

    const profile = await prisma.productProfile.upsert({
      where: {
        catalogProductId_userId: { catalogProductId, userId: session.user.id },
      },
      create: {
        catalogProductId,
        userId: session.user.id,
        ...data,
      },
      update: data,
      include: { catalogProduct: { select: { name: true } } },
    });

    return NextResponse.json({
      id: profile.id,
      catalogProductId: profile.catalogProductId,
      catalogProductName: profile.catalogProduct.name,
      oneLiner: profile.oneLiner,
      elevatorPitch: profile.elevatorPitch,
      valueProps: profile.valueProps,
      painPoints: profile.painPoints,
      bestForDepartments: profile.bestForDepartments,
      bestForIndustries: profile.bestForIndustries,
      technicalRequirements: profile.technicalRequirements,
      objectionHandlers: profile.objectionHandlers,
      competitivePositioning: profile.competitivePositioning,
      linkedCaseStudyIds: profile.linkedCaseStudyIds,
      priceRangeText: profile.priceRangeText,
      dealSizeSweetSpot: profile.dealSizeSweetSpot,
      salesCycle: profile.salesCycle,
      deployment: profile.deployment,
      updatedAt: profile.updatedAt,
    });
  } catch (e) {
    console.error('PUT catalog-products profile', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
