import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { generateSalesPageSections } from '@/lib/campaigns/generate-sales-page';

export const maxDuration = 60;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * POST /api/roadmap/targets/[targetId]/sales-page
 * Body: { action: "create_with_content" } — generates real typed sections and creates a live campaign
 *        { action: "create_placeholder" } — reserves URL with "Coming Soon" shell (deprecated)
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ targetId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { targetId } = await context.params;
  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action !== 'create_with_content') {
    return NextResponse.json(
      { error: 'action must be "create_with_content"' },
      { status: 400 }
    );
  }

  const target = await prisma.roadmapTarget.findFirst({
    where: {
      id: targetId,
      targetType: 'division',
      roadmap: { userId: session.user.id },
    },
    include: {
      roadmap: { select: { userId: true } },
      company: { select: { id: true, name: true } },
      companyDepartment: { select: { id: true, customName: true } },
    },
  });

  if (!target?.company?.id || !target.companyDepartment?.id) {
    return NextResponse.json(
      { error: 'Division target not found or not linked to company/department' },
      { status: 404 }
    );
  }

  const existing = await prisma.segmentCampaign.findFirst({
    where: {
      userId: session.user.id,
      companyId: target.company.id,
      departmentId: target.companyDepartment.id,
    },
    select: { id: true, slug: true, url: true, status: true },
  });
  if (existing) {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://app.agentpilot.us';
    const url = existing.url || `${baseUrl}/go/${existing.slug}`;
    return NextResponse.json({
      contentId: existing.id,
      status: existing.status ?? 'live',
      url,
      targetId: target.id,
      targetName: target.name,
      companyName: target.company.name,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyName: true },
  });
  const aeSlug = slugify((user?.companyName ?? 'company').slice(0, 20));
  const baseSlug = slugify(
    `${target.company.name}-${target.companyDepartment.customName ?? target.name}`
  ).slice(0, 30);
  let slug = `${baseSlug}-${aeSlug}`;
  let attempt = 0;
  while (
    await prisma.segmentCampaign.findFirst({
      where: { userId: session.user.id, slug },
      select: { id: true },
    })
  ) {
    attempt++;
    slug = `${baseSlug}-${aeSlug}-${attempt}`;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://app.agentpilot.us';
  const fullUrl = `${baseUrl}/go/${slug}`;

  const result = await generateSalesPageSections({
    companyId: target.company.id,
    userId: session.user.id,
    pageType: 'account_intro',
    departmentId: target.companyDepartment.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  const { headline, subheadline, sections, ctaLabel, ctaUrl } = result.data;

  const campaign = await prisma.segmentCampaign.create({
    data: {
      userId: session.user.id,
      companyId: target.company.id,
      departmentId: target.companyDepartment.id,
      slug,
      title: `${target.name} at ${target.company.name}`,
      url: fullUrl,
      type: 'landing_page',
      pageType: 'sales_page',
      status: 'live',
      headline: headline ?? null,
      subheadline: subheadline ?? null,
      body: null,
      sections: sections as Prisma.InputJsonValue,
      ctaLabel: ctaLabel ?? null,
      ctaUrl: ctaUrl ?? null,
    },
  });

  return NextResponse.json({
    contentId: campaign.id,
    status: 'live',
    url: fullUrl,
    targetId: target.id,
    targetName: target.name,
    companyName: target.company.name,
  });
}
