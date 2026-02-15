import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { addExpansionScore } from '@/lib/gamification/expansion-score';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const companies = await prisma.company.findMany({
    where: { userId: session.user.id },
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
    const { name, domain, industry } = body;
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
        industry: industry?.trim() || null,
        userId: session.user.id,
      },
    });
    void addExpansionScore(prisma, session.user.id, 'account_created').catch(() => {});
    return NextResponse.json({ company });
  } catch (e) {
    console.error('Create company error:', e);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
