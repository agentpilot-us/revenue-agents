import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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
 * Body: { action: "create_placeholder" }
 * Creates a SegmentCampaign (sales page) with status "placeholder" for this division target.
 * Reserves the URL; page renders "Coming Soon" until HTML is provided.
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
  if (body.action !== 'create_placeholder') {
    return NextResponse.json(
      { error: 'Only action create_placeholder is supported' },
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
  const aeSlug = slugify((user?.companyName ?? 'nvidia').slice(0, 20));
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
      status: 'placeholder',
      headline: `A personalized sales page for ${target.name} at ${target.company.name} is being prepared.`,
    },
  });

  return NextResponse.json({
    contentId: campaign.id,
    status: 'placeholder',
    url: fullUrl,
    targetId: target.id,
    targetName: target.name,
    companyName: target.company.name,
  });
}
