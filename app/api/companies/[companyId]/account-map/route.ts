import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type RoleTag = "DECISION_MAKER" | "CHAMPION" | "INFLUENCER" | "OTHER";
type EngagementType = "PAGE_VIEW" | "REPLY" | "MEETING" | "NONE";

function deriveRoleTag(title: string | null, enrichedData: any): RoleTag {
  if (!title) return "OTHER";
  const execPattern = /CFO|CIO|CTO|CISO|CEO|VP|Vice President|Head/i;
  const influencerPattern = /Manager|Lead/i;
  
  // Check for champion flag in enrichedData JSON field
  if (enrichedData && typeof enrichedData === 'object') {
    if (enrichedData.isChampion === true) return "CHAMPION";
  }
  
  if (execPattern.test(title)) return "DECISION_MAKER";
  if (influencerPattern.test(title)) return "INFLUENCER";
  return "OTHER";
}

function computeEngagementScore(
  contactId: string,
  activities: Array<{ type: string; createdAt: Date }>,
  visits: Array<{ visitedAt: Date }>
): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let score = 0;
  activities.forEach(a => {
    if (a.createdAt < thirtyDaysAgo) return;
    if (a.type === 'EmailReply' || a.type === 'EMAIL_REPLY') score += 5;
    if (a.type === 'MEETING_SCHEDULED') score += 3;
  });
  
  visits.forEach(v => {
    if (v.visitedAt < thirtyDaysAgo) return;
    score += 1;
  });
  
  return score;
}

function getLastEngagement(
  contactId: string,
  activities: Array<{ type: string; createdAt: Date }>,
  visits: Array<{ visitedAt: Date }>
): { type: EngagementType; at: string | null } {
  const allEvents: Array<{ type: EngagementType; at: Date }> = [];
  
  // Add activities
  activities.forEach(a => {
    if (a.type === 'EmailReply' || a.type === 'EMAIL_REPLY') {
      allEvents.push({ type: 'REPLY', at: a.createdAt });
    } else if (a.type === 'MEETING_SCHEDULED') {
      allEvents.push({ type: 'MEETING', at: a.createdAt });
    }
  });
  
  // Add visits
  visits.forEach(v => {
    allEvents.push({ type: 'PAGE_VIEW', at: v.visitedAt });
  });
  
  if (allEvents.length === 0) {
    return { type: 'NONE', at: null };
  }
  
  // Get most recent event
  const mostRecent = allEvents.reduce((latest, current) => 
    current.at > latest.at ? current : latest
  );
  
  return {
    type: mostRecent.type,
    at: mostRecent.at.toISOString(),
  };
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

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: {
        id: true,
        name: true,
        domain: true,
      },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Fetch microsegments (departments)
    const departments = await prisma.companyDepartment.findMany({
      where: { companyId },
      select: {
        id: true,
        type: true,
        customName: true,
        useCase: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch contacts
    const contacts = await prisma.contact.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        email: true,
        linkedinUrl: true,
        companyDepartmentId: true,
        enrichedData: true, // Use enrichedData JSON field for storing champion flag if needed
      },
    });

    // Fetch activities for contacts (last 30 days)
    const contactIds = contacts.map(c => c.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await prisma.activity.findMany({
      where: {
        companyId,
        contactId: { in: contactIds },
        createdAt: { gte: thirtyDaysAgo },
        type: { in: ['EmailReply', 'EMAIL_REPLY', 'MEETING_SCHEDULED'] },
      },
      select: {
        contactId: true,
        type: true,
        createdAt: true,
      },
    });

    // Fetch campaign visits for contacts (last 30 days)
    const contactEmails = contacts.map(c => c.email).filter(Boolean) as string[];
    const visits = await prisma.campaignVisit.findMany({
      where: {
        campaign: { companyId },
        visitorEmail: { in: contactEmails },
        visitedAt: { gte: thirtyDaysAgo },
      },
      select: {
        visitorEmail: true,
        visitedAt: true,
      },
    });

    // Group activities and visits by contact
    const activitiesByContact: Record<string, Array<{ type: string; createdAt: Date }>> = {};
    activities.forEach(a => {
      if (a.contactId) {
        if (!activitiesByContact[a.contactId]) {
          activitiesByContact[a.contactId] = [];
        }
        activitiesByContact[a.contactId].push({
          type: a.type,
          createdAt: a.createdAt,
        });
      }
    });

    const visitsByEmail: Record<string, Array<{ visitedAt: Date }>> = {};
    visits.forEach(v => {
      if (v.visitorEmail) {
        if (!visitsByEmail[v.visitorEmail]) {
          visitsByEmail[v.visitorEmail] = [];
        }
        visitsByEmail[v.visitorEmail].push({
          visitedAt: v.visitedAt,
        });
      }
    });

    // Format microsegments
    const microsegments = departments.map(dept => ({
      id: dept.id,
      name: dept.customName || dept.type.replace(/_/g, ' '),
      type: dept.type as "FUNCTIONAL" | "DIVISIONAL" | "USE_CASE",
      description: dept.useCase || undefined,
    }));

    // Format contacts with computed fields
    const formattedContacts = contacts.map(contact => {
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown';
      const contactActivities = activitiesByContact[contact.id] || [];
      const contactVisits = contact.email ? (visitsByEmail[contact.email] || []) : [];
      
      const engagementScore = computeEngagementScore(contact.id, contactActivities, contactVisits);
      const lastEngagement = getLastEngagement(contact.id, contactActivities, contactVisits);
      const roleTag = deriveRoleTag(contact.title, contact.enrichedData);

      return {
        id: contact.id,
        name,
        title: contact.title || '',
        email: contact.email,
        linkedinUrl: contact.linkedinUrl,
        microsegmentId: contact.companyDepartmentId,
        lastEngagement,
        engagementScore,
        roleTag,
      };
    });

    return NextResponse.json({
      account: {
        name: company.name,
        domain: company.domain,
      },
      microsegments,
      contacts: formattedContacts,
    });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/account-map error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account map data' },
      { status: 500 }
    );
  }
}
