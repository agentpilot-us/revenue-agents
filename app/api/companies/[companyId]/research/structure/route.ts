import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { structureResearchWithClaude } from '@/lib/research/research-company';

export const maxDuration = 60;

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
      select: { id: true, name: true, domain: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json();
    const summary = typeof body.summary === 'string' ? body.summary : undefined;
    if (!summary) {
      return NextResponse.json(
        { error: 'Missing summary from previous research step' },
        { status: 400 }
      );
    }

    const result = await structureResearchWithClaude(
      company.name,
      company.domain ?? undefined,
      summary,
      session.user.id
    );

    if (!result.ok) {
      console.error('Research (structure) failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/structure error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Research failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
