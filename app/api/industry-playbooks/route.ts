import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const postBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  overview: z.string().optional().nullable(),
  departmentProductMapping: z
    .array(
      z.object({
        department: z.string(),
        productIds: z.array(z.string()),
        typicalDealSize: z.string().optional(),
      })
    )
    .optional()
    .nullable(),
  valuePropsByDepartment: z.record(z.unknown()).optional().nullable(),
  buyingCommittee: z.string().optional().nullable(),
  landmines: z.array(z.string()).optional().nullable(),
  relevantCaseStudyIds: z.array(z.string()).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slugParam = searchParams.get('slug');

    if (slugParam) {
      const playbook = await prisma.industryPlaybook.findFirst({
        where: { userId: session.user.id, slug: slugParam },
      });
      if (!playbook) {
        return NextResponse.json({ error: 'Industry playbook not found' }, { status: 404 });
      }
      return NextResponse.json({
        id: playbook.id,
        name: playbook.name,
        slug: playbook.slug,
        overview: playbook.overview,
        departmentProductMapping: playbook.departmentProductMapping as unknown[] | null,
        valuePropsByDepartment: playbook.valuePropsByDepartment as Record<string, unknown> | null,
        buyingCommittee: playbook.buyingCommittee,
        landmines: playbook.landmines as string[] | null,
        relevantCaseStudyIds: playbook.relevantCaseStudyIds as string[] | null,
        updatedAt: playbook.updatedAt,
      });
    }

    const playbooks = await prisma.industryPlaybook.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      playbooks.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        overview: p.overview,
        departmentProductMapping: p.departmentProductMapping,
        valuePropsByDepartment: p.valuePropsByDepartment,
        buyingCommittee: p.buyingCommittee,
        landmines: p.landmines,
        relevantCaseStudyIds: p.relevantCaseStudyIds,
        updatedAt: p.updatedAt,
      }))
    );
  } catch (e) {
    console.error('GET industry-playbooks', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.industryPlaybook.findUnique({
      where: {
        userId_slug: { userId: session.user.id, slug: parsed.data.slug },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An industry playbook with this slug already exists' },
        { status: 409 }
      );
    }

    const playbook = await prisma.industryPlaybook.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        slug: parsed.data.slug,
        overview: parsed.data.overview ?? undefined,
        departmentProductMapping: (parsed.data.departmentProductMapping ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        valuePropsByDepartment: (parsed.data.valuePropsByDepartment ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        buyingCommittee: parsed.data.buyingCommittee ?? undefined,
        landmines: (parsed.data.landmines ?? undefined) as Prisma.InputJsonValue | undefined,
        relevantCaseStudyIds: (parsed.data.relevantCaseStudyIds ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });

    return NextResponse.json({
      id: playbook.id,
      name: playbook.name,
      slug: playbook.slug,
      overview: playbook.overview,
      departmentProductMapping: playbook.departmentProductMapping,
      valuePropsByDepartment: playbook.valuePropsByDepartment,
      buyingCommittee: playbook.buyingCommittee,
      landmines: playbook.landmines,
      relevantCaseStudyIds: playbook.relevantCaseStudyIds,
      updatedAt: playbook.updatedAt,
    });
  } catch (e) {
    console.error('POST industry-playbooks', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
