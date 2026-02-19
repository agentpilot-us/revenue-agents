import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const putBodySchema = z.object({
  name: z.string().min(1).optional(),
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

    let slugUpdate: string | undefined;
    if (parsed.data.name !== undefined) {
      const baseSlug = slugify(parsed.data.name) || 'playbook';
      let slug = baseSlug;
      let suffix = 1;
      let exists = await prisma.industryPlaybook.findFirst({
        where: { userId: session.user.id, slug },
      });
      if (exists && exists.id !== id) {
        while (exists) {
          slug = `${baseSlug}-${suffix}`;
          exists = await prisma.industryPlaybook.findFirst({
            where: { userId: session.user.id, slug },
          });
          if (!exists || exists.id === id) break;
          suffix++;
        }
      }
      if (!exists || exists.id === id) slugUpdate = slug;
    }

    const toJson = (v: unknown) => (v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue));
    const updated = await prisma.industryPlaybook.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(slugUpdate !== undefined && { slug: slugUpdate }),
        ...(parsed.data.overview !== undefined && { overview: parsed.data.overview }),
        ...(parsed.data.departmentProductMapping !== undefined && {
          departmentProductMapping: toJson(parsed.data.departmentProductMapping),
        }),
        ...(parsed.data.valuePropsByDepartment !== undefined && {
          valuePropsByDepartment: toJson(parsed.data.valuePropsByDepartment),
        }),
        ...(parsed.data.buyingCommittee !== undefined && {
          buyingCommittee: parsed.data.buyingCommittee,
        }),
        ...(parsed.data.landmines !== undefined && {
          landmines: toJson(parsed.data.landmines),
        }),
        ...(parsed.data.relevantCaseStudyIds !== undefined && {
          relevantCaseStudyIds: toJson(parsed.data.relevantCaseStudyIds),
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
