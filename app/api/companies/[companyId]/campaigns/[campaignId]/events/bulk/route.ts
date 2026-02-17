import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ContentType, Prisma } from '@prisma/client';

type PageSectionEvent = { title?: string; date?: string; description?: string; url?: string };
type PageSections = { events?: PageSectionEvent[]; caseStudy?: unknown; successStory?: unknown };
type DeptConfigItem = { id: string; name: string; slug?: string; headline?: string; body?: string; pageSections?: PageSections | null };
type DepartmentConfig = { departments?: DeptConfigItem[] };

function eventFromContentLibrary(item: { id: string; title: string; sourceUrl: string | null; content: unknown }): PageSectionEvent {
  const content = (item.content as { eventDate?: string; description?: string; registrationUrl?: string } | null) ?? {};
  return {
    title: item.title,
    date: content.eventDate ?? '',
    description: (content.description as string) ?? item.title,
    url: content.registrationUrl ?? item.sourceUrl ?? undefined,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; campaignId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, campaignId } = await params;
    const body = await req.json().catch(() => ({}));
    const eventsPayload = body.events as Array<{ contentLibraryId: string; departmentId?: string }> | undefined;

    if (!Array.isArray(eventsPayload) || eventsPayload.length === 0) {
      return NextResponse.json({ error: 'events array is required (items: { contentLibraryId, departmentId? })' }, { status: 400 });
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const campaign = await prisma.segmentCampaign.findFirst({
      where: { id: campaignId, companyId },
      select: { id: true, pageSections: true, isMultiDepartment: true, departmentConfig: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const contentLibraryIds = [...new Set(eventsPayload.map((e) => e.contentLibraryId))];
    const eventItems = await prisma.contentLibrary.findMany({
      where: {
        id: { in: contentLibraryIds },
        userId: session.user.id,
        type: ContentType.CompanyEvent,
        isActive: true,
      },
      select: { id: true, title: true, sourceUrl: true, content: true },
    });
    const eventMap = new Map(eventItems.map((e) => [e.id, e]));

    const isMulti = Boolean((campaign as { isMultiDepartment?: boolean }).isMultiDepartment);
    const departmentConfig = (campaign as { departmentConfig?: DepartmentConfig }).departmentConfig as DepartmentConfig | null;

    if (isMulti && departmentConfig?.departments) {
      const depts = departmentConfig.departments.map((d) => ({
        ...d,
        pageSections: { ...(d.pageSections ?? {}), events: [...(d.pageSections?.events ?? [])] } as PageSections,
      }));
      for (const { contentLibraryId: cid, departmentId } of eventsPayload) {
        const item = eventMap.get(cid);
        if (!item || !departmentId) continue;
        const idx = depts.findIndex((d) => d.id === departmentId);
        if (idx === -1) continue;
        const entry = eventFromContentLibrary(item);
        const ps = depts[idx].pageSections ?? {};
        depts[idx].pageSections = { ...ps, events: [...(ps.events ?? []), entry] };
      }
      await prisma.segmentCampaign.update({
        where: { id: campaignId },
        data: { departmentConfig: { departments: depts } as Prisma.InputJsonValue },
      });
    } else {
      const pageSections = (campaign.pageSections ?? {}) as PageSections;
      let events = [...(pageSections.events ?? [])];
      const seen = new Set<string>();
      for (const { contentLibraryId: cid } of eventsPayload) {
        const item = eventMap.get(cid);
        if (!item || seen.has(cid)) continue;
        seen.add(cid);
        events.push(eventFromContentLibrary(item));
      }
      await prisma.segmentCampaign.update({
        where: { id: campaignId },
        data: { pageSections: { ...pageSections, events } as Prisma.InputJsonValue },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST campaigns/events/bulk', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
