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
    const contentLibraryId = body.contentLibraryId as string | undefined;
    const departmentId = body.departmentId as string | undefined;

    if (!contentLibraryId) {
      return NextResponse.json({ error: 'contentLibraryId is required' }, { status: 400 });
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

    const eventItem = await prisma.contentLibrary.findFirst({
      where: {
        id: contentLibraryId,
        userId: session.user.id,
        type: ContentType.CompanyEvent,
        isActive: true,
      },
      select: { id: true, title: true, sourceUrl: true, content: true },
    });
    if (!eventItem) {
      return NextResponse.json({ error: 'Event not found or not an event' }, { status: 404 });
    }

    const eventEntry = eventFromContentLibrary(eventItem);

    const isMulti = Boolean((campaign as { isMultiDepartment?: boolean }).isMultiDepartment);
    const departmentConfig = (campaign as { departmentConfig?: DepartmentConfig }).departmentConfig as DepartmentConfig | null;

    if (isMulti && departmentConfig?.departments) {
      if (!departmentId) {
        return NextResponse.json({ error: 'departmentId required for multi-department campaign' }, { status: 400 });
      }
      const depts = [...departmentConfig.departments];
      const idx = depts.findIndex((d) => d.id === departmentId);
      if (idx === -1) {
        return NextResponse.json({ error: 'Department not found in campaign' }, { status: 400 });
      }
      const dept = depts[idx];
      const pageSections = (dept.pageSections ?? {}) as PageSections;
      const events = [...(pageSections.events ?? []), eventEntry];
      depts[idx] = { ...dept, pageSections: { ...pageSections, events } };
      await prisma.segmentCampaign.update({
        where: { id: campaignId },
        data: { departmentConfig: { departments: depts } as Prisma.InputJsonValue },
      });
    } else {
      const pageSections = (campaign.pageSections ?? {}) as PageSections;
      const events = [...(pageSections.events ?? []), eventEntry];
      await prisma.segmentCampaign.update({
        where: { id: campaignId },
        data: { pageSections: { ...pageSections, events } as Prisma.InputJsonValue },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST campaigns/events', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
