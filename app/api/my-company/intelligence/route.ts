import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/** Client sends null to clear fields; z.string().optional() rejects null. */
const optionalNullableString = z.union([z.string(), z.null()]).optional();

const PatchSchema = z.object({
  companyName: optionalNullableString,
  companyWebsite: optionalNullableString,
  companyLogoUrl: optionalNullableString,
  companyIndustry: optionalNullableString,
  primaryIndustrySellTo: optionalNullableString,
  keyInitiatives: z.array(z.string()).optional(),
  valuePropositions: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      companyName: true,
      companyWebsite: true,
      companyLogoUrl: true,
      companyIndustry: true,
      primaryIndustrySellTo: true,
      companies: {
        select: {
          id: true,
          name: true,
          industry: true,
          website: true,
          keyInitiatives: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const primaryAccount = user.companies[0];
  const keyInitiatives =
    (primaryAccount?.keyInitiatives as string[] | null) ?? [];

  return NextResponse.json({
    companyName:
      user.companyName?.trim() ? user.companyName.trim() : primaryAccount?.name ?? null,
    companyWebsite:
      user.companyWebsite?.trim() ? user.companyWebsite.trim() : primaryAccount?.website ?? null,
    companyLogoUrl: user.companyLogoUrl ?? null,
    companyIndustry:
      user.companyIndustry?.trim()
        ? user.companyIndustry.trim()
        : primaryAccount?.industry ?? null,
    primaryIndustrySellTo: user.primaryIndustrySellTo?.trim() || null,
    keyInitiatives,
    valuePropositions: [] as string[],
    segments: [] as string[],
    lastUpdatedAt: user.updatedAt,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const input = PatchSchema.parse(json);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(input.companyName !== undefined && {
          companyName: input.companyName === null ? null : input.companyName.trim() || null,
        }),
        ...(input.companyWebsite !== undefined && {
          companyWebsite: input.companyWebsite === null ? null : input.companyWebsite.trim() || null,
        }),
        ...(input.companyLogoUrl !== undefined && {
          companyLogoUrl: input.companyLogoUrl === null ? null : input.companyLogoUrl.trim() || null,
        }),
        ...(input.companyIndustry !== undefined && {
          companyIndustry: input.companyIndustry === null ? null : input.companyIndustry.trim() || null,
        }),
        ...(input.primaryIndustrySellTo !== undefined && {
          primaryIndustrySellTo:
            input.primaryIndustrySellTo === null ? null : input.primaryIndustrySellTo.trim() || null,
        }),
      },
      select: {
        companyName: true,
        companyWebsite: true,
        companyLogoUrl: true,
        companyIndustry: true,
        primaryIndustrySellTo: true,
        updatedAt: true,
      },
    });

    const primaryCompany = await prisma.company.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (primaryCompany) {
      const companyPatch: {
        keyInitiatives?: string[];
        name?: string;
        website?: string | null;
        industry?: string | null;
      } = {};

      if (input.keyInitiatives !== undefined) {
        companyPatch.keyInitiatives = input.keyInitiatives;
      }
      if (input.companyName !== undefined) {
        const n = input.companyName === null ? null : input.companyName.trim() || null;
        if (n) companyPatch.name = n;
      }
      if (input.companyWebsite !== undefined) {
        companyPatch.website =
          input.companyWebsite === null ? null : input.companyWebsite.trim() || null;
      }
      if (input.companyIndustry !== undefined) {
        companyPatch.industry =
          input.companyIndustry === null ? null : input.companyIndustry.trim() || null;
      }

      if (Object.keys(companyPatch).length > 0) {
        await prisma.company.update({
          where: { id: primaryCompany.id },
          data: companyPatch,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      companyName: user.companyName,
      companyWebsite: user.companyWebsite,
      companyLogoUrl: user.companyLogoUrl,
      companyIndustry: user.companyIndustry,
      primaryIndustrySellTo: user.primaryIndustrySellTo,
      lastUpdatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('PATCH /api/my-company/intelligence error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update My Company intelligence' },
      { status: 500 }
    );
  }
}


