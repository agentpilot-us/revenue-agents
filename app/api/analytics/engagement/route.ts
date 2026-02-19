import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 30 days if no date range provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const userId = session.user.id;

    // Base where clause for filtering
    const companyWhere = companyId
      ? { id: companyId, userId }
      : { userId };

    // 1. New Contacts Added - by week, account, buying group
    const contacts = await prisma.contact.findMany({
      where: {
        company: companyWhere,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        companyDepartment: {
          select: {
            id: true,
            type: true,
            customName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group contacts by week
    const contactsByWeek: Record<string, typeof contacts> = {};
    const contactsByAccount: Record<string, typeof contacts> = {};
    const contactsByBuyingGroup: Record<string, typeof contacts> = {};

    for (const contact of contacts) {
      // Group by week (ISO week)
      const weekKey = getWeekKey(contact.createdAt);
      if (!contactsByWeek[weekKey]) {
        contactsByWeek[weekKey] = [];
      }
      contactsByWeek[weekKey].push(contact);

      // Group by account
      const accountId = contact.companyId;
      if (!contactsByAccount[accountId]) {
        contactsByAccount[accountId] = [];
      }
      contactsByAccount[accountId].push(contact);

      // Group by buying group
      const deptKey = contact.companyDepartmentId || 'unassigned';
      if (!contactsByBuyingGroup[deptKey]) {
        contactsByBuyingGroup[deptKey] = [];
      }
      contactsByBuyingGroup[deptKey].push(contact);
    }

    const newContactsByWeek = Object.entries(contactsByWeek).map(([week, contacts]) => ({
      week,
      count: contacts.length,
      contacts: contacts.map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        accountId: c.company.id,
        accountName: c.company.name,
        buyingGroupId: c.companyDepartmentId,
        buyingGroupName: c.companyDepartment
          ? c.companyDepartment.customName || c.companyDepartment.type.replace(/_/g, ' ')
          : null,
      })),
    }));

    const newContactsByAccount = Object.entries(contactsByAccount).map(([accountId, contacts]) => ({
      accountId,
      accountName: contacts[0]?.company.name || '',
      count: contacts.length,
    }));

    const newContactsByBuyingGroup = Object.entries(contactsByBuyingGroup).map(
      ([deptId, contacts]) => ({
        buyingGroupId: deptId === 'unassigned' ? null : deptId,
        buyingGroupName:
          deptId === 'unassigned'
            ? 'Unassigned'
            : contacts[0]?.companyDepartment
              ? contacts[0].companyDepartment.customName ||
                contacts[0].companyDepartment.type.replace(/_/g, ' ')
              : 'Unknown',
        count: contacts.length,
      })
    );

    // 2. Landing Page Performance - per campaign
    const visits = await prisma.campaignVisit.findMany({
      where: {
        campaign: {
          company: companyWhere,
        },
        visitedAt: { gte: startDate, lte: endDate },
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Aggregate by campaign
    const campaignPerformance: Record<
      string,
      {
        campaignId: string;
        campaignTitle: string;
        campaignSlug: string;
        accountId: string;
        accountName: string;
        visits: number;
        uniqueVisitors: number;
        chatMessages: number;
        ctaClicks: number;
      }
    > = {};

    for (const visit of visits) {
      const campaignId = visit.campaignId;
      if (!campaignPerformance[campaignId]) {
        campaignPerformance[campaignId] = {
          campaignId,
          campaignTitle: visit.campaign.title,
          campaignSlug: visit.campaign.slug,
          accountId: visit.campaign.company.id,
          accountName: visit.campaign.company.name,
          visits: 0,
          uniqueVisitors: 0,
          chatMessages: 0,
          ctaClicks: 0,
        };
      }
      campaignPerformance[campaignId].visits++;
      campaignPerformance[campaignId].chatMessages += visit.chatMessages || 0;
      if (visit.ctaClicked) {
        campaignPerformance[campaignId].ctaClicks++;
      }
    }

    // Calculate unique visitors per campaign
    for (const campaignId of Object.keys(campaignPerformance)) {
      const campaignVisits = visits.filter((v) => v.campaignId === campaignId);
      const uniqueSessions = new Set(
        campaignVisits.map((v) => v.sessionId).filter(Boolean)
      );
      campaignPerformance[campaignId].uniqueVisitors = uniqueSessions.size;
    }

    const landingPagePerformance = Object.values(campaignPerformance);

    // 3. Email Engagement
    const [emailsSent, emailsOpened, emailsClicked] = await Promise.all([
      prisma.activity.count({
        where: {
          company: companyWhere,
          type: { in: ['Email', 'EMAIL_SENT'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.activity.count({
        where: {
          company: companyWhere,
          type: 'EmailOpen',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.activity.count({
        where: {
          company: companyWhere,
          type: 'EmailClick',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const emailEngagement = {
      sent: emailsSent,
      opened: emailsOpened,
      clicked: emailsClicked,
      openRate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0,
      clickRate: emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0,
    };

    // 4. Buying Group Coverage
    const allAccounts = await prisma.company.findMany({
      where: { userId },
      select: { id: true },
    });

    const totalAccounts = allAccounts.length;

    const coverageByType = await Promise.all(
      Object.values(DepartmentType).map(async (type) => {
        const accountsWithType = await prisma.company.count({
          where: {
            userId,
            departments: {
              some: {
                type,
                contacts: {
                  some: {},
                },
              },
            },
          },
        });
        return {
          type,
          typeLabel: type.replace(/_/g, ' '),
          accountsWithContacts: accountsWithType,
          totalAccounts,
          coverage: totalAccounts > 0 ? (accountsWithType / totalAccounts) * 100 : 0,
        };
      })
    );

    // Filter out types with 0 coverage for cleaner display
    const buyingGroupCoverage = coverageByType
      .filter((c) => c.coverage > 0)
      .sort((a, b) => b.coverage - a.coverage);

    // 5. Warm Contacts
    const allContactEmails = await prisma.contact.findMany({
      where: {
        company: companyWhere,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const contactEmailSet = new Set(
      allContactEmails.map((c) => c.email).filter(Boolean) as string[]
    );

    // Get warm contacts from CampaignVisit
    const warmVisits = await prisma.campaignVisit.findMany({
      where: {
        campaign: {
          company: companyWhere,
        },
        visitorEmail: {
          in: Array.from(contactEmailSet),
        },
        OR: [{ ctaClicked: true }, { timeOnPage: { gt: 0 } }],
      },
      select: {
        visitorEmail: true,
      },
      distinct: ['visitorEmail'],
    });

    const warmEmails = new Set(
      warmVisits.map((v) => v.visitorEmail).filter(Boolean) as string[]
    );

    // Get warm contacts from email engagement
    const emailEngagedActivities = await prisma.activity.findMany({
      where: {
        company: companyWhere,
        type: { in: ['EmailOpen', 'EmailClick'] },
        contact: {
          email: {
            in: Array.from(contactEmailSet),
          },
        },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyId: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    emailEngagedActivities.forEach((activity) => {
      if (activity.contact?.email) {
        warmEmails.add(activity.contact.email);
      }
    });

    // Map warm emails back to contacts
    const warmContacts = allContactEmails
      .filter((c) => c.email && warmEmails.has(c.email))
      .map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        email: c.email,
        accountId: c.company.id,
        accountName: c.company.name,
      }));

    return NextResponse.json({
      newContacts: {
        total: contacts.length,
        byWeek: newContactsByWeek,
        byAccount: newContactsByAccount,
        byBuyingGroup: newContactsByBuyingGroup,
      },
      landingPagePerformance,
      emailEngagement,
      buyingGroupCoverage,
      warmContacts: {
        total: warmContacts.length,
        contacts: warmContacts,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/engagement error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Helper function to get ISO week key (YYYY-WW format)
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - week1.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}
