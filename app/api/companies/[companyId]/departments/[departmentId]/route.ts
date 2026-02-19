import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  valueProp: z.string().optional().nullable(),
  useCase: z.string().optional().nullable(),
  estimatedOpportunity: z.string().optional().nullable(),
  objectionHandlers: z.array(z.object({
    objection: z.string(),
    response: z.string(),
  })).optional().nullable(),
  proofPoints: z.array(z.string()).optional().nullable(),
  targetRoles: z.object({
    economicBuyer: z.array(z.string()).optional(),
    technicalEvaluator: z.array(z.string()).optional(),
    champion: z.array(z.string()).optional(),
    influencer: z.array(z.string()).optional(),
  }).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; departmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, departmentId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const department = await prisma.companyDepartment.findFirst({
      where: { id: departmentId, companyId },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateDepartmentSchema.parse(body);

    const updated = await prisma.companyDepartment.update({
      where: { id: departmentId },
      data: {
        ...(validated.valueProp !== undefined && { valueProp: validated.valueProp }),
        ...(validated.useCase !== undefined && { useCase: validated.useCase }),
        ...(validated.estimatedOpportunity !== undefined && { estimatedOpportunity: validated.estimatedOpportunity }),
        ...(validated.objectionHandlers !== undefined && { objectionHandlers: validated.objectionHandlers }),
        ...(validated.proofPoints !== undefined && { proofPoints: validated.proofPoints }),
        ...(validated.targetRoles !== undefined && { targetRoles: validated.targetRoles }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('PATCH /api/companies/[companyId]/departments/[departmentId] error:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}
