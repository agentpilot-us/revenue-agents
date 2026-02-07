import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const companies = await prisma.company.findMany({
    where: { createdById: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, domain, stage, tier, industry } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        domain: domain?.trim() || null,
        stage: stage?.trim() || 'Prospect',
        tier: tier?.trim() || null,
        industry: industry?.trim() || null,
        createdById: session.user.id,
      },
    });
    return NextResponse.json({ company });
  } catch (e) {
    console.error('Create company error:', e);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
