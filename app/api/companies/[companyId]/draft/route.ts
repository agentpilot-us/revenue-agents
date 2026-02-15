import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const patchDraftSchema = z.object({
  step: z.number().int().min(1).max(3).optional(),
  data: z.record(z.unknown()).optional(),
});

export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    const parsed = patchDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { step, data } = parsed.data;
    const update: { workflowStep?: number; draftData?: Prisma.InputJsonValue } = {};
    if (step != null) update.workflowStep = step;
    if (data != null) update.draftData = data as Prisma.InputJsonValue;

    await prisma.company.update({
      where: { id: companyId },
      data: update,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/companies/[companyId]/draft error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save draft' },
      { status: 500 }
    );
  }
}
