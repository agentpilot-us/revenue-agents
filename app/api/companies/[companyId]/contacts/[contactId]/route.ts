import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  companyDepartmentId: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; contactId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, contactId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json();
    const { companyDepartmentId } = patchSchema.parse(body);

    if (companyDepartmentId) {
      const dept = await prisma.companyDepartment.findFirst({
        where: { id: companyDepartmentId, companyId },
      });
      if (!dept) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
      }
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, companyId },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: { companyDepartmentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('PATCH contact error:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
