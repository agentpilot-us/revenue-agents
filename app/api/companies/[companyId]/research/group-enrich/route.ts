import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  enrichBuyingGroup,
  runPerplexityResearchOnly,
} from '@/lib/research/research-company';
import type { BuyingGroupDetail, BuyingGroupSeed } from '@/lib/research/company-research-schema';

export const maxDuration = 120;

type EnrichItem = {
  groupId: string;
  ok: boolean;
  data?: BuyingGroupDetail;
  error?: string;
};

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
    const groups = Array.isArray(body.groups) ? body.groups : [];
    const userGoal =
      typeof body.userGoal === 'string' ? body.userGoal.trim() || undefined : undefined;

    if (groups.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include groups (array of buying group seeds).' },
        { status: 400 }
      );
    }

    const perplexityResult = await runPerplexityResearchOnly(
      company.name,
      company.domain ?? undefined,
      session.user.id,
      userGoal
    );
    if (!perplexityResult.ok) {
      const msg = perplexityResult.error;
      const isSetup =
        msg.includes('company setup') ||
        msg.includes('Content Library') ||
        msg.includes('No products found');
      return NextResponse.json(
        { error: msg },
        { status: isSetup ? 400 : 500 }
      );
    }

    const summary = perplexityResult.summary;

    const settled = await Promise.allSettled(
      groups.map((seed: BuyingGroupSeed) =>
        enrichBuyingGroup(
          company.name,
          company.domain ?? undefined,
          seed,
          session.user.id!,
          summary,
          userGoal
        )
      )
    );

    const results: EnrichItem[] = groups.map((seed: BuyingGroupSeed, i: number) => {
      const s = settled[i];
      if (s.status === 'rejected') {
        return {
          groupId: seed.id,
          ok: false,
          error: s.reason?.message ?? 'Enrichment threw.',
        };
      }
      const r = s.value;
      if (r.ok) {
        return { groupId: seed.id, ok: true, data: r.data };
      }
      return { groupId: seed.id, ok: false, error: r.error };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/group-enrich error:', error);
    const message = error instanceof Error ? error.message : 'Group enrichment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
