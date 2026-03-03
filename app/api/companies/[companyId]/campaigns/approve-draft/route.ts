import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'campaign';
}

async function ensureUniqueSlug(
  userId: string,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let existing = await prisma.segmentCampaign.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  let suffix = 0;
  while (existing) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
    existing = await prisma.segmentCampaign.findUnique({
      where: { userId_slug: { userId, slug } },
    });
  }
  return slug;
}

const draftSchema = z.object({
  departmentId: z.string().nullable(),
  segmentName: z.string(),
  headline: z.string(),
  subheadline: z.string().optional().nullable(),
  sections: z.array(z.unknown()).min(1),
  ctaLabel: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
});

const bodySchema = z.object({
  drafts: z.array(draftSchema).min(1).max(5),
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
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
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

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const created: Array<{
      id: string;
      slug: string;
      url: string;
      segmentName: string;
      departmentId: string | null;
    }> = [];

    for (const d of parsed.data.drafts) {
      const companyPart = slugify(company.name);
      const segmentPart = d.departmentId && d.segmentName?.trim() ? slugify(d.segmentName) : '';
      const baseSlug = segmentPart ? `${companyPart}-${segmentPart}` : companyPart || 'campaign';
      const slug = await ensureUniqueSlug(session.user.id, baseSlug);
      const url = `${baseUrl}/go/${slug}`;

      const campaign = await prisma.segmentCampaign.create({
        data: {
          userId: session.user.id,
          companyId,
          departmentId: d.departmentId ?? null,
          slug,
          title: d.headline || 'Landing page',
          description: null,
          type: 'landing_page',
          url,
          headline: d.headline || null,
          subheadline: d.subheadline ?? null,
          body: null,
          ctaLabel: d.ctaLabel ?? null,
          ctaUrl: d.ctaUrl ?? null,
          sections: d.sections as Prisma.InputJsonValue,
          pageType: 'sales_page',
        },
        select: { id: true, slug: true, url: true },
      });

      created.push({
        id: campaign.id,
        slug: campaign.slug,
        url: campaign.url,
        segmentName: d.segmentName,
        departmentId: d.departmentId,
      });
    }

    return NextResponse.json({
      companyId,
      campaigns: created,
    });
  } catch (e) {
    console.error('POST campaigns/approve-draft', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
