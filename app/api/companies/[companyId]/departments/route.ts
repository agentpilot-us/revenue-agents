import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType, DepartmentStatus } from '@prisma/client';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  type: z.nativeEnum(DepartmentType),
  customName: z.string().optional(),
  status: z.nativeEnum(DepartmentStatus).default(DepartmentStatus.NOT_ENGAGED),
  estimatedSize: z.number().optional(),
  budget: z.number().optional(),
  notes: z.string().optional(),
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
    const validated = createDepartmentSchema.parse(body);

    const department = await prisma.companyDepartment.create({
      data: {
        companyId,
        type: validated.type,
        customName: validated.customName,
        status: validated.status,
        estimatedSize: validated.estimatedSize,
        ...(validated.budget != null && { budget: validated.budget }),
        notes: validated.notes,
      },
      include: {
        company: true,
        contacts: true,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A department of this type already exists for this company' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
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

  const departments = await prisma.companyDepartment.findMany({
    where: { companyId },
    select: {
      id: true,
      companyId: true,
      type: true,
      customName: true,
      status: true,
      notes: true,
      estimatedSize: true,
      valueProp: true,
      useCase: true,
      estimatedOpportunity: true,
      objectionHandlers: true,
      proofPoints: true,
      targetRoles: true,
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          engagementScore: true,
          persona: {
            select: {
              name: true,
            },
          },
        },
      },
      companyProducts: {
        include: { product: true },
      },
      _count: {
        select: {
          contacts: true,
          activities: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(departments);
}
