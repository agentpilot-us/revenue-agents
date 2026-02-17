import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getValuePropsForDepartment } from '@/lib/prompt-context';

const postBodySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  type: z.enum(['landing_page', 'event_invite', 'demo', 'webinar', 'other']).default('landing_page'),
  description: z.string().optional(),
  url: z.string().url().optional(),
  hostOnVercel: z.boolean().optional(),
  departmentId: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  isMultiDepartment: z.boolean().optional().default(false),
  departmentIds: z.array(z.string()).max(10).optional().default([]),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'campaign';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const { searchParams } = new URL(_req.url);
    const departmentId = searchParams.get('departmentId') ?? undefined;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ companyId, campaigns: [] });
    }

    const campaigns = await prisma.segmentCampaign.findMany({
      where: {
        companyId,
        userId: session.user.id,
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, customName: true, type: true } },
      },
      orderBy: [{ departmentId: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      companyId,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        url: c.url,
        type: c.type,
        departmentId: c.departmentId,
        department: c.department
          ? { id: c.department.id, customName: c.department.customName, type: c.department.type }
          : null,
        headline: c.headline,
        body: c.body,
        ctaLabel: c.ctaLabel,
        ctaUrl: c.ctaUrl,
        isMultiDepartment: (c as { isMultiDepartment?: boolean }).isMultiDepartment ?? false,
        departmentConfig: (c as { departmentConfig?: unknown }).departmentConfig ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('GET campaigns', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

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
      select: { id: true, industry: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.isMultiDepartment && parsed.data.departmentIds.length > 0) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const origin = req.headers.get('origin') || baseUrl;
      const res = await fetch(`${origin}/api/companies/${companyId}/campaigns/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
        body: JSON.stringify({
          scope: 'segments',
          departmentIds: parsed.data.departmentIds,
          options: { includeFutureEvents: true, addCaseStudy: false, showSuccessStory: false },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: (err as { error?: string }).error ?? 'Failed to generate drafts' },
          { status: res.status }
        );
      }
      const { drafts } = (await res.json()) as { drafts: Array<{ departmentId: string | null; segmentName: string; headline: string; body: string; pageSections?: unknown }> };
      const departments = drafts.map((d) => ({
        id: d.departmentId ?? '',
        name: d.segmentName,
        slug: slugify(d.segmentName).slice(0, 60) || 'dept',
        headline: d.headline || d.segmentName,
        body: d.body || null,
        pageSections: d.pageSections ?? null,
      }));

      let slug = parsed.data.slug || slugify(parsed.data.title);
      let existing = await prisma.segmentCampaign.findUnique({
        where: { userId_slug: { userId: session.user.id, slug } },
      });
      let suffix = 0;
      while (existing) {
        suffix += 1;
        slug = `${parsed.data.slug || slugify(parsed.data.title)}-${suffix}`;
        existing = await prisma.segmentCampaign.findUnique({
          where: { userId_slug: { userId: session.user.id, slug } },
        });
      }
      const finalUrl = `${baseUrl}/go/${slug}`;
      const campaign = await prisma.segmentCampaign.create({
        data: {
          userId: session.user.id,
          companyId,
          departmentId: null,
          slug,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          type: parsed.data.type,
          url: finalUrl,
          headline: null,
          body: null,
          ctaLabel: parsed.data.ctaLabel ?? null,
          ctaUrl: parsed.data.ctaUrl ?? null,
          isMultiDepartment: true,
          departmentConfig: { departments } as Prisma.InputJsonValue,
        },
        include: {
          department: { select: { id: true, customName: true, type: true } },
        },
      });
      return NextResponse.json({
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        description: campaign.description,
        url: campaign.url,
        type: campaign.type,
        departmentId: campaign.departmentId,
        department: null,
        headline: campaign.headline,
        body: campaign.body,
        ctaLabel: campaign.ctaLabel,
        ctaUrl: campaign.ctaUrl,
        isMultiDepartment: true,
        departmentConfig: (campaign as { departmentConfig?: unknown }).departmentConfig,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      });
    }

    let prefillHeadline = parsed.data.headline ?? null;
    let prefillBody = parsed.data.body ?? null;
    if (parsed.data.departmentId && (prefillHeadline == null || prefillBody == null)) {
      const department = await prisma.companyDepartment.findFirst({
        where: { id: parsed.data.departmentId, companyId },
        select: { type: true, customName: true },
      });
      if (department) {
        const valueProps = await getValuePropsForDepartment(
          session.user.id,
          company.industry ?? null,
          department
        );
        if (valueProps) {
          if (prefillHeadline == null) prefillHeadline = valueProps.headline || null;
          if (prefillBody == null) prefillBody = valueProps.pitch || null;
        }
      }
    }

    let slug = parsed.data.slug || slugify(parsed.data.title);
    let existing = await prisma.segmentCampaign.findUnique({
      where: { userId_slug: { userId: session.user.id, slug } },
    });
    let suffix = 0;
    while (existing) {
      suffix += 1;
      slug = `${parsed.data.slug || slugify(parsed.data.title)}-${suffix}`;
      existing = await prisma.segmentCampaign.findUnique({
        where: { userId_slug: { userId: session.user.id, slug } },
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const url =
      parsed.data.hostOnVercel
        ? `${baseUrl}/go/PLACEHOLDER`
        : (parsed.data.url ?? '');

    if (!parsed.data.hostOnVercel && !parsed.data.url) {
      return NextResponse.json(
        { error: 'Either url or hostOnVercel must be provided' },
        { status: 400 }
      );
    }

    const campaign = await prisma.segmentCampaign.create({
      data: {
        userId: session.user.id,
        companyId,
        departmentId: parsed.data.departmentId ?? null,
        slug,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        url,
        headline: prefillHeadline ?? parsed.data.headline ?? null,
        body: prefillBody ?? parsed.data.body ?? null,
        ctaLabel: parsed.data.ctaLabel ?? null,
        ctaUrl: parsed.data.ctaUrl ?? null,
        isMultiDepartment: false,
      },
      include: {
        department: { select: { id: true, customName: true, type: true } },
      },
    });

    if (parsed.data.hostOnVercel) {
      const finalUrl = `${baseUrl}/go/${campaign.slug}`;
      await prisma.segmentCampaign.update({
        where: { id: campaign.id },
        data: { url: finalUrl },
      });
      (campaign as { url: string }).url = finalUrl;
    }

    return NextResponse.json({
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description,
      url: campaign.url,
      type: campaign.type,
      departmentId: campaign.departmentId,
      department: campaign.department
        ? { id: campaign.department.id, customName: campaign.department.customName, type: campaign.department.type }
        : null,
      headline: campaign.headline,
      body: campaign.body,
      ctaLabel: campaign.ctaLabel,
      ctaUrl: campaign.ctaUrl,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('POST campaigns', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
