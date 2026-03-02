import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const PatchSchema = z.object({
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyLogoUrl: z.string().optional(),
  companyIndustry: z.string().optional(),
  primaryIndustrySellTo: z.string().optional(),
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
    companyName: user.companyName ?? primaryAccount?.name ?? null,
    companyWebsite: user.companyWebsite ?? primaryAccount?.website ?? null,
    companyLogoUrl: user.companyLogoUrl ?? null,
    companyIndustry: user.companyIndustry ?? primaryAccount?.industry ?? null,
    primaryIndustrySellTo: user.primaryIndustrySellTo ?? null,
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
        ...(input.companyName !== undefined && { companyName: input.companyName }),
        ...(input.companyWebsite !== undefined && {
          companyWebsite: input.companyWebsite,
        }),
        ...(input.companyLogoUrl !== undefined && {
          companyLogoUrl: input.companyLogoUrl,
        }),
        ...(input.companyIndustry !== undefined && {
          companyIndustry: input.companyIndustry,
        }),
        ...(input.primaryIndustrySellTo !== undefined && {
          primaryIndustrySellTo: input.primaryIndustrySellTo,
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

    // Optionally persist keyInitiatives into the user's primary Company record
    if (input.keyInitiatives) {
      const primaryCompany = await prisma.company.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (primaryCompany) {
        await prisma.company.update({
          where: { id: primaryCompany.id },
          data: { keyInitiatives: input.keyInitiatives },
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


