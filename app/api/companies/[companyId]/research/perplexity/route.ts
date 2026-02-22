import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { runPerplexityResearchOnly } from '@/lib/research/research-company';

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

    const body = await req.json().catch(() => ({}));
    const userGoal = typeof body.userGoal === 'string' ? body.userGoal.trim() || undefined : undefined;

    const result = await runPerplexityResearchOnly(
      company.name,
      company.domain ?? undefined,
      session.user.id,
      userGoal
    );

    if (!result.ok) {
      const msg = result.error || 'Research failed';
      const isSetupRequired =
        msg.includes('company setup') || msg.includes('Content Library');
      if (isSetupRequired) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error('Research (perplexity) failed:', result.error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ summary: result.summary });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/perplexity error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Research failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
