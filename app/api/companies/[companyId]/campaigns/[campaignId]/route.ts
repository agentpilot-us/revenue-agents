import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchBodySchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  type: z.enum(['landing_page', 'event_invite', 'demo', 'webinar', 'other']).optional(),
  description: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; campaignId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, campaignId } = await params;

    const existing = await prisma.segmentCampaign.findFirst({
      where: { id: campaignId, companyId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const conflict = await prisma.segmentCampaign.findUnique({
        where: { userId_slug: { userId: session.user.id, slug: parsed.data.slug } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: 'Slug already in use by another campaign' },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title != null) data.title = parsed.data.title;
    if (parsed.data.slug != null) data.slug = parsed.data.slug;
    if (parsed.data.type != null) data.type = parsed.data.type;
    if ('description' in parsed.data) data.description = parsed.data.description ?? null;
    if ('url' in parsed.data) data.url = parsed.data.url ?? existing.url;
    if ('departmentId' in parsed.data) data.departmentId = parsed.data.departmentId ?? null;
    if ('headline' in parsed.data) data.headline = parsed.data.headline ?? null;
    if ('body' in parsed.data) data.body = parsed.data.body ?? null;
    if ('ctaLabel' in parsed.data) data.ctaLabel = parsed.data.ctaLabel ?? null;
    if ('ctaUrl' in parsed.data) data.ctaUrl = parsed.data.ctaUrl ?? null;

    const campaign = await prisma.segmentCampaign.update({
      where: { id: campaignId },
      data: data as Parameters<typeof prisma.segmentCampaign.update>[0]['data'],
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
    console.error('PATCH campaign', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string; campaignId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, campaignId } = await params;

    const existing = await prisma.segmentCampaign.findFirst({
      where: { id: campaignId, companyId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await prisma.segmentCampaign.delete({ where: { id: campaignId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE campaign', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
