import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { isDemoAccount } from '@/lib/demo/is-demo-account';
import { generateSalesPageSections } from '@/lib/campaigns/generate-sales-page';
import type { PageType } from '@/lib/campaigns/build-sales-page-prompt';

export const maxDuration = 60;

const bodySchema = z.object({
  scope: z.enum(['company', 'segments']),
  departmentIds: z.array(z.string()).max(5).optional().default([]),
  pageType: z.enum(['feature_announcement', 'event_invite', 'account_intro', 'case_study']).optional().default('account_intro'),
});

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
      select: { id: true, name: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (await isDemoAccount(companyId)) {
      const campaigns = await prisma.segmentCampaign.findMany({
        where: { companyId },
        select: {
          id: true,
          departmentId: true,
          title: true,
          headline: true,
          subheadline: true,
          sections: true,
          ctaLabel: true,
          ctaUrl: true,
          department: { select: { customName: true, type: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (campaigns.length === 0) {
        return NextResponse.json(
          { error: 'Demo account has no campaigns. Create a campaign during demo setup first.' },
          { status: 400 }
        );
      }
      const drafts = campaigns.map((c) => ({
        departmentId: c.departmentId ?? null,
        segmentName: c.department?.customName ?? c.department?.type?.replace(/_/g, ' ') ?? c.title,
        headline: c.headline ?? '',
        subheadline: c.subheadline ?? null,
        sections: c.sections ?? null,
        ctaLabel: c.ctaLabel ?? null,
        ctaUrl: c.ctaUrl ?? null,
      }));
      return NextResponse.json({ companyId, companyName: company.name, drafts });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { scope, departmentIds, pageType } = parsed.data;

    type Target = { departmentId: string | null; segmentName: string };
    let targets: Target[] = [];

    if (scope === 'company') {
      targets = [{ departmentId: null, segmentName: company.name }];
    } else {
      if (!departmentIds.length) {
        return NextResponse.json(
          { error: 'departmentIds required when scope is segments (max 5)' },
          { status: 400 }
        );
      }
      const depts = await prisma.companyDepartment.findMany({
        where: { companyId, id: { in: departmentIds } },
        select: { id: true, customName: true, type: true },
      });
      if (depts.length === 0) {
        return NextResponse.json(
          { error: 'No valid departments found for the given departmentIds' },
          { status: 400 }
        );
      }
      targets = depts.map((d) => ({
        departmentId: d.id,
        segmentName: d.customName || d.type.replace(/_/g, ' '),
      }));
    }

    const results = await Promise.all(
      targets.map((target) =>
        generateSalesPageSections({
          companyId,
          userId: session.user.id,
          pageType: pageType as PageType,
          departmentId: target.departmentId,
        }).then((r) => ({ target, result: r }))
      )
    );

    const drafts = results.map(({ target, result }) => {
      if (!result.ok) {
        return {
          departmentId: target.departmentId,
          segmentName: target.segmentName,
          headline: '',
          subheadline: null as string | null,
          sections: null,
          ctaLabel: null as string | null,
          ctaUrl: null as string | null,
          error: result.error,
        };
      }
      return {
        departmentId: target.departmentId,
        segmentName: target.segmentName,
        headline: result.data.headline,
        subheadline: result.data.subheadline ?? null,
        sections: result.data.sections,
        ctaLabel: result.data.ctaLabel ?? null,
        ctaUrl: result.data.ctaUrl ?? null,
      };
    });

    return NextResponse.json({
      companyId,
      companyName: company.name,
      drafts,
    });
  } catch (e) {
    console.error('POST campaigns/generate-draft', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
