import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'campaign';
}

/** Generate unique slug for user from company name + optional segment name. */
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

const pageSectionEventSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
});
const pageSectionRefSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  link: z.string().optional(),
});
const pageSectionsSchema = z.object({
  events: z.array(pageSectionEventSchema).optional(),
  caseStudy: pageSectionRefSchema.optional(),
  successStory: pageSectionRefSchema.optional(),
}).optional().nullable();

const draftSchema = z.object({
  departmentId: z.string().nullable(),
  segmentName: z.string(),
  headline: z.string(),
  body: z.string(),
  pageSections: pageSectionsSchema.optional(),
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
          body: d.body || null,
          ctaLabel: null,
          ctaUrl: null,
          pageSections: d.pageSections ?? undefined,
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
