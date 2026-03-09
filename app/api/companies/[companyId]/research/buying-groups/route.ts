import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { discoverBuyingGroupsForAccount } from '@/lib/research/research-company';
import { parseDealContext } from '@/lib/types/deal-context';

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
    const dealGoal =
      typeof body.dealGoal === 'string' ? body.dealGoal.trim() || undefined : undefined;
    const userGoal = dealGoal ?? (typeof body.userGoal === 'string' ? body.userGoal.trim() || undefined : undefined);
    const rawDealContext = body.dealContext;
    const dealContext =
      rawDealContext != null && typeof rawDealContext === 'object'
        ? parseDealContext(rawDealContext)
        : undefined;

    if (dealContext) {
      await prisma.company.update({
        where: { id: companyId, userId: session.user.id },
        data: {
          dealContext: rawDealContext as object,
          ...(userGoal != null && { researchGoal: userGoal }),
        },
      });
    } else if (userGoal != null) {
      await prisma.company.update({
        where: { id: companyId, userId: session.user.id },
        data: { researchGoal: userGoal },
      });
    }

    const result = await discoverBuyingGroupsForAccount(
      company.name,
      company.domain ?? undefined,
      session.user.id,
      userGoal,
      dealContext
    );

    if (!result.ok) {
      const msg = result.error;
      const isSetup =
        msg.includes('company setup') ||
        msg.includes('Content Library') ||
        msg.includes('No products found');
      return NextResponse.json(
        { error: msg },
        { status: isSetup ? 400 : 500 }
      );
    }

    return NextResponse.json({ data: result.data, perplexitySummary: result.perplexitySummary });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/buying-groups error:', error);
    const message = error instanceof Error ? error.message : 'Discovery failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
