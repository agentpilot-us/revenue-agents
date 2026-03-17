import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { deleteWebset } from '@/lib/exa/websets';

const PATCH_ALLOWED = ['dealObjective', 'accountType', 'primaryMotion', 'name', 'domain', 'industry', 'size'] as const;

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

    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const key of PATCH_ALLOWED) {
      if (key in body) {
        data[key] = body[key] === null || body[key] === '' ? null : body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: data as { dealObjective?: string | null; accountType?: string | null; primaryMotion?: string | null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/companies/[companyId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
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

    // Clean up Exa Webset before deleting the company
    if (company.exaWebsetId) {
      await deleteWebset(company.exaWebsetId).catch(() => {});
    }

    await prisma.company.delete({
      where: { id: companyId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/companies/[companyId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
