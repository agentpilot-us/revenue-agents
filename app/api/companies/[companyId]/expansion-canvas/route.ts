import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Fetch all departments
    const departments = await prisma.companyDepartment.findMany({
      where: { companyId },
      select: {
        id: true,
        type: true,
        customName: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch campaigns per department
    const campaigns = await prisma.segmentCampaign.findMany({
      where: { companyId },
      select: {
        id: true,
        departmentId: true,
        slug: true,
        url: true,
      },
    });

    // Create campaign lookup by department
    const campaignByDept: Record<string, { url: string | null; slug: string }> = {};
    campaigns.forEach(campaign => {
      if (campaign.departmentId) {
        campaignByDept[campaign.departmentId] = {
          url: campaign.url,
          slug: campaign.slug,
        };
      }
    });

    // Count contacts per department
    const contactCounts = await prisma.contact.groupBy({
      by: ['companyDepartmentId'],
      where: { companyId },
      _count: { id: true },
    });

    const contactsCountByDept: Record<string, number> = {};
    contactCounts.forEach(item => {
      if (item.companyDepartmentId) {
        contactsCountByDept[item.companyDepartmentId] = item._count.id;
      }
    });

    // Count page views per department (from CampaignVisit)
    const visits = await prisma.campaignVisit.findMany({
      where: {
        campaign: { companyId },
        departmentId: { not: null },
      },
      select: {
        departmentId: true,
        visitedAt: true,
      },
    });

    const pageViewsByDept: Record<string, number> = {};
    const lastActivityByDept: Record<string, Date> = {};
    visits.forEach(visit => {
      if (visit.departmentId) {
        pageViewsByDept[visit.departmentId] = (pageViewsByDept[visit.departmentId] || 0) + 1;
        if (!lastActivityByDept[visit.departmentId] || visit.visitedAt > lastActivityByDept[visit.departmentId]) {
          lastActivityByDept[visit.departmentId] = visit.visitedAt;
        }
      }
    });

    // Get last activity from Activity table as well
    const activities = await prisma.activity.findMany({
      where: {
        companyId,
        companyDepartmentId: { not: null },
      },
      select: {
        companyDepartmentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    activities.forEach(activity => {
      if (activity.companyDepartmentId) {
        const deptId = activity.companyDepartmentId;
        if (!lastActivityByDept[deptId] || activity.createdAt > lastActivityByDept[deptId]) {
          lastActivityByDept[deptId] = activity.createdAt;
        }
      }
    });

    // Format microsegments
    const microsegments = departments.map(dept => {
      const campaign = campaignByDept[dept.id];
      const hasPage = !!campaign;
      const pageUrl = campaign?.url || null;
      const contactsCount = contactsCountByDept[dept.id] || 0;
      const pageViews = pageViewsByDept[dept.id] || 0;
      const lastActivityAt = lastActivityByDept[dept.id]?.toISOString() || null;

      return {
        id: dept.id,
        name: dept.customName || dept.type.replace(/_/g, ' '),
        type: dept.type as "FUNCTIONAL" | "DIVISIONAL" | "USE_CASE",
        hasPage,
        pageUrl,
        contactsCount,
        pageViews,
        lastActivityAt,
      };
    });

    return NextResponse.json({ microsegments });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/expansion-canvas error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expansion canvas data' },
      { status: 500 }
    );
  }
}
