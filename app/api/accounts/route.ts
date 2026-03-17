import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isDemoUser } from '@/lib/demo/context';
import { enrichCompanyWithExa } from '@/lib/exa/enrich-company';

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
        // Official demo users get live demos (real content, API/LLM); do not lock as frozen demo
        ...(isDemoUser(session.user as { email?: string | null }) && { isDemoAccount: false }),
      },
    });

    // Trigger enrichment in background (signals + contact discovery)
    void enrichCompanyWithExa(company.id).catch((e) => {
      console.error('Enrichment error:', e);
    });

    return NextResponse.json({
      company,
      status: 'researching',
      message: 'Company created. AI is researching now...',
    });
  } catch (e) {
    console.error('Create company error:', e);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
