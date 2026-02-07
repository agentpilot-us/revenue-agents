import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: {
      id,
      createdById: session.user.id,
    },
    include: {
      _count: { select: { contacts: true, buyingGroups: true } },
    },
  });
  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ company });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, createdById: session.user.id },
  });
  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const body = await req.json();
    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(body.name != null && { name: String(body.name).trim() }),
        ...(body.domain != null && { domain: body.domain ? String(body.domain).trim() : null }),
        ...(body.stage != null && { stage: String(body.stage) }),
        ...(body.tier != null && { tier: body.tier ? String(body.tier) : null }),
        ...(body.industry != null && { industry: body.industry ? String(body.industry) : null }),
      },
    });
    return NextResponse.json({ company: updated });
  } catch (e) {
    console.error('Update company error:', e);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}
