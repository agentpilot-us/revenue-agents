import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const putBodySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const playbook = await prisma.industryPlaybook.findFirst({
      where: { id, userId: session.user.id },
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
  } catch (e) {
    console.error('GET industry-playbooks/[id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const playbook = await prisma.industryPlaybook.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!playbook) {
      return NextResponse.json({ error: 'Industry playbook not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = putBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.slug !== undefined && parsed.data.slug !== playbook.slug) {
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
    }

    const updated = await prisma.industryPlaybook.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.slug !== undefined && { slug: parsed.data.slug }),
        ...(parsed.data.overview !== undefined && { overview: parsed.data.overview }),
        ...(parsed.data.departmentProductMapping !== undefined && {
          departmentProductMapping: parsed.data.departmentProductMapping,
        }),
        ...(parsed.data.valuePropsByDepartment !== undefined && {
          valuePropsByDepartment: parsed.data.valuePropsByDepartment,
        }),
        ...(parsed.data.buyingCommittee !== undefined && {
          buyingCommittee: parsed.data.buyingCommittee,
        }),
        ...(parsed.data.landmines !== undefined && { landmines: parsed.data.landmines }),
        ...(parsed.data.relevantCaseStudyIds !== undefined && {
          relevantCaseStudyIds: parsed.data.relevantCaseStudyIds,
        }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      overview: updated.overview,
      departmentProductMapping: updated.departmentProductMapping,
      valuePropsByDepartment: updated.valuePropsByDepartment,
      buyingCommittee: updated.buyingCommittee,
      landmines: updated.landmines,
      relevantCaseStudyIds: updated.relevantCaseStudyIds,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    console.error('PUT industry-playbooks/[id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const playbook = await prisma.industryPlaybook.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!playbook) {
      return NextResponse.json({ error: 'Industry playbook not found' }, { status: 404 });
    }

    await prisma.industryPlaybook.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('DELETE industry-playbooks/[id]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
