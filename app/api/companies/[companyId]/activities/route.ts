import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const contactId = searchParams.get('contactId');
    const departmentId = searchParams.get('departmentId');
    const channel = searchParams.get('channel');

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get AgentPilot activities
    const activityWhere: any = { companyId };
    if (contactId) activityWhere.contactId = contactId;
    if (departmentId) activityWhere.companyDepartmentId = departmentId;

    const agentActivities = await prisma.activity.findMany({
      where: activityWhere,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        companyDepartment: {
          select: {
            id: true,
            customName: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get campaign visits (landing page activities)
    const campaignWhere: any = {
      campaign: { companyId },
    };
    if (contactId) {
      // Match by contact email
      const contact = await prisma.contact.findFirst({
        where: { id: contactId },
        select: { email: true },
      });
      if (contact?.email) {
        campaignWhere.visitorEmail = contact.email;
      }
    }

    const campaignVisits = await prisma.campaignVisit.findMany({
      where: campaignWhere,
      include: {
        campaign: {
          include: {
            department: {
              select: {
                id: true,
                customName: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get Salesforce activities if connected
    let salesforceActivities: any[] = [];
    if (!channel || channel === 'salesforce') {
      try {
        const sfRes = await fetch(
          `${req.nextUrl.origin}/api/companies/${companyId}/salesforce/activities`
        );
        if (sfRes.ok) {
          const sfData = await sfRes.json();
          salesforceActivities = sfData.activities || [];
        }
      } catch (error) {
        // Silently fail - Salesforce may not be connected
      }
    }

    // Merge and format activities
    const activities: any[] = [];

    // AgentPilot activities
    for (const activity of agentActivities) {
      if (channel && channel !== 'email' && channel !== 'manual') continue;
      activities.push({
        id: activity.id,
        type: activity.type,
        summary: activity.summary,
        createdAt: activity.createdAt,
        contactId: activity.contactId,
        contactName: activity.contact
          ? [activity.contact.firstName, activity.contact.lastName].filter(Boolean).join(' ').trim() || null
          : null,
        departmentId: activity.companyDepartmentId,
        departmentName: activity.companyDepartment
          ? activity.companyDepartment.customName || activity.companyDepartment.type.replace(/_/g, ' ')
          : null,
        channel: activity.type === 'EMAIL_SENT' || activity.type === 'Email' ? 'email' : 'manual',
      });
    }

    // Campaign visits
    for (const visit of campaignVisits) {
      if (channel && channel !== 'landing_page' && channel !== 'chat') continue;
      if (visit.ctaClicked) {
        activities.push({
          id: `visit-cta-${visit.id}`,
          type: 'CTA Clicked',
          summary: `CTA clicked on ${visit.campaign.title}`,
          createdAt: visit.createdAt,
          contactId: null, // Could match by email
          departmentId: visit.campaign.departmentId,
          departmentName: visit.campaign.department
            ? visit.campaign.department.customName || visit.campaign.department.type.replace(/_/g, ' ')
            : null,
          channel: 'landing_page',
          metadata: {
            ctaClicked: true,
            visitorEmail: visit.visitorEmail,
          },
        });
      }
      if (visit.timeOnPage && visit.timeOnPage > 0) {
        activities.push({
          id: `visit-${visit.id}`,
          type: 'Landing Page Visit',
          summary: `Visited ${visit.campaign.title}`,
          createdAt: visit.createdAt,
          contactId: null,
          departmentId: visit.campaign.departmentId,
          departmentName: visit.campaign.department
            ? visit.campaign.department.customName || visit.campaign.department.type.replace(/_/g, ' ')
            : null,
          channel: 'landing_page',
          metadata: {
            visitorEmail: visit.visitorEmail,
          },
        });
      }
      if (visit.chatMessages && visit.chatMessages > 0) {
        activities.push({
          id: `chat-${visit.id}`,
          type: 'Chat Interaction',
          summary: `Chat interaction on ${visit.campaign.title}`,
          createdAt: visit.createdAt,
          contactId: null,
          departmentId: visit.campaign.departmentId,
          departmentName: visit.campaign.department
            ? visit.campaign.department.customName || visit.campaign.department.type.replace(/_/g, ' ')
            : null,
          channel: 'chat',
          metadata: {
            chatMessages: visit.chatMessages,
            visitorEmail: visit.visitorEmail,
          },
        });
      }
    }

    // Salesforce activities
    for (const sfActivity of salesforceActivities) {
      activities.push({
        id: `sf-${sfActivity.id}`,
        type: sfActivity.type,
        summary: sfActivity.summary || sfActivity.subject,
        createdAt: new Date(sfActivity.createdDate || sfActivity.lastModifiedDate),
        contactId: null,
        departmentId: null,
        channel: 'salesforce',
      });
    }

    // Sort by date descending
    activities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
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
    const body = await req.json();
    const { type, summary, contactId, departmentId } = body;

    if (!type || !summary) {
      return NextResponse.json(
        { error: 'type and summary are required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const activity = await prisma.activity.create({
      data: {
        companyId,
        userId: session.user.id,
        type,
        summary,
        ...(contactId && { contactId }),
        ...(departmentId && { companyDepartmentId: departmentId }),
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('POST /api/companies/[companyId]/activities error:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
