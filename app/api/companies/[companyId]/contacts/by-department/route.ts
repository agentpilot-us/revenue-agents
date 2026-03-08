import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function sevenDaysAgoUTC(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

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
    const includeEmailActivity = req.nextUrl.searchParams.get('includeEmailActivity') === 'week';

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get all contacts with their department
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
        personaId: true,
        enrichmentStatus: true,
        enrichedData: true,
        seniority: true,
        seniorityLevel: true,
        persona: {
          select: {
            name: true,
          },
        },
        companyDepartment: {
          select: {
            id: true,
            type: true,
            customName: true,
            targetRoles: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Get warm contacts (those who viewed landing page or clicked CTA)
    const contactEmails = contacts.map((c) => c.email).filter(Boolean) as string[];
    const warmVisits = await prisma.campaignVisit.findMany({
      where: {
        campaign: {
          companyId,
        },
        visitorEmail: {
          in: contactEmails,
        },
        OR: [
          { ctaClicked: true },
          { timeOnPage: { gt: 0 } },
        ],
      },
      select: {
        visitorEmail: true,
      },
      distinct: ['visitorEmail'],
    });

    const warmEmails = new Set(warmVisits.map((v) => v.visitorEmail).filter(Boolean));

    // Contacts who have email/meeting/reply activity (contacted or engaged)
    const contactIds = contacts.map((c) => c.id);
    const activitiesByContact = await prisma.activity.findMany({
      where: {
        companyId,
        contactId: { in: contactIds },
        type: { in: ['EMAIL_SENT', 'Email', 'MEETING_SCHEDULED', 'Meeting', 'REPLY', 'Reply'] },
      },
      select: { contactId: true },
      distinct: ['contactId'],
    });
    const contactedContactIds = new Set(activitiesByContact.map((a) => a.contactId).filter(Boolean));

    // Event attendance per contact (GTC invites, executive meetings, etc.)
    const eventAttendances = await prisma.eventAttendance.findMany({
      where: { contactId: { in: contactIds } },
      select: { contactId: true, eventName: true, rsvpStatus: true },
    });
    const eventsByContact: Record<string, { eventName: string; rsvpStatus: string | null }[]> = {};
    for (const ea of eventAttendances) {
      if (!eventsByContact[ea.contactId]) eventsByContact[ea.contactId] = [];
      eventsByContact[ea.contactId].push({ eventName: ea.eventName, rsvpStatus: ea.rsvpStatus });
    }

    // Optional: email activity in last 7 days (per contact + account total)
    let emailsSentByContact: Record<string, number> = {};
    let accountEmailsSentThisWeek = 0;
    if (includeEmailActivity && contactIds.length > 0) {
      const since = sevenDaysAgoUTC();
      const emailActivities = await prisma.activity.findMany({
        where: {
          companyId,
          type: { in: ['Email', 'EMAIL_SENT'] },
          createdAt: { gte: since },
          contactId: { in: contactIds },
        },
        select: { contactId: true },
      });
      for (const a of emailActivities) {
        if (a.contactId) {
          emailsSentByContact[a.contactId] = (emailsSentByContact[a.contactId] ?? 0) + 1;
        }
      }
      accountEmailsSentThisWeek = await prisma.activity.count({
        where: {
          companyId,
          type: { in: ['Email', 'EMAIL_SENT'] },
          createdAt: { gte: since },
        },
      });
    }

    // Group contacts by department
    const contactsByDept: Record<string, typeof contacts> = {};
    const unassignedContacts: typeof contacts = [];

    for (const contact of contacts) {
      if (contact.companyDepartmentId) {
        const deptId = contact.companyDepartmentId;
        if (!contactsByDept[deptId]) {
          contactsByDept[deptId] = [];
        }
        contactsByDept[deptId].push(contact);
      } else {
        unassignedContacts.push(contact);
      }
    }

    // Get departments
    const departments = await prisma.companyDepartment.findMany({
      where: { companyId },
      select: {
        id: true,
        type: true,
        customName: true,
        targetRoles: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format response
    type DepartmentGroup = {
      department: {
        id: string | null;
        name: string;
        type: string | null;
        targetRoles: any;
      };
      contacts: Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        title: string | null;
        email: string | null;
        linkedinUrl: string | null;
        personaName: string | null;
        enrichmentStatus: string | null;
        isWarm: boolean;
        buyingRole: string | null;
        whyRelevant: string | null;
        engagementStatus: 'Not enriched' | 'Enriched' | 'Contacted' | 'Engaged';
        seniority: string | null;
        seniorityLevel: number | null;
        emailsSentThisWeek?: number;
        eventAttendances: { eventName: string; rsvpStatus: string | null }[];
      }>;
    };

    const result: DepartmentGroup[] = departments.map((dept) => ({
      department: {
        id: dept.id,
        name: dept.customName || dept.type.replace(/_/g, ' '),
        type: dept.type,
        targetRoles: dept.targetRoles,
      },
      contacts: (contactsByDept[dept.id] || []).map((c) => {
        const enriched = c.enrichedData as { whyRelevant?: string } | null;
        const isWarm = c.email ? warmEmails.has(c.email) : false;
        const contacted = contactedContactIds.has(c.id);
        const engagementStatus: 'Not enriched' | 'Enriched' | 'Contacted' | 'Engaged' =
          isWarm || (contacted && (c.enrichmentStatus === 'complete' || !!c.email))
            ? 'Engaged'
            : contacted
              ? 'Contacted'
              : c.enrichmentStatus === 'complete'
                ? 'Enriched'
                : 'Not enriched';
        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          email: c.email,
          linkedinUrl: c.linkedinUrl,
          personaName: c.persona?.name ?? null,
          enrichmentStatus: c.enrichmentStatus,
          isWarm,
          buyingRole: c.persona?.name ?? null,
          whyRelevant: enriched?.whyRelevant ?? null,
          engagementStatus,
          seniority: c.seniority,
          seniorityLevel: c.seniorityLevel,
          eventAttendances: eventsByContact[c.id] ?? [],
          ...(includeEmailActivity && {
            emailsSentThisWeek: emailsSentByContact[c.id] ?? 0,
          }),
        };
      }),
    }));

    // Add unassigned contacts
    if (unassignedContacts.length > 0) {
      result.push({
        department: {
          id: null,
          name: 'Unassigned',
          type: null,
          targetRoles: null,
        },
        contacts: unassignedContacts.map((c) => {
          const enriched = c.enrichedData as { whyRelevant?: string } | null;
          const isWarm = c.email ? warmEmails.has(c.email) : false;
          const contacted = contactedContactIds.has(c.id);
          const engagementStatus: 'Not enriched' | 'Enriched' | 'Contacted' | 'Engaged' =
            isWarm || (contacted && (c.enrichmentStatus === 'complete' || !!c.email))
              ? 'Engaged'
              : contacted
                ? 'Contacted'
                : c.enrichmentStatus === 'complete'
                  ? 'Enriched'
                  : 'Not enriched';
          return {
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            title: c.title,
            email: c.email,
            linkedinUrl: c.linkedinUrl,
            personaName: c.persona?.name ?? null,
            enrichmentStatus: c.enrichmentStatus,
            isWarm,
            buyingRole: c.persona?.name ?? null,
            whyRelevant: enriched?.whyRelevant ?? null,
            engagementStatus,
            seniority: c.seniority,
            seniorityLevel: c.seniorityLevel,
            eventAttendances: eventsByContact[c.id] ?? [],
            ...(includeEmailActivity && {
              emailsSentThisWeek: emailsSentByContact[c.id] ?? 0,
            }),
          };
        }),
      });
    }

    const payload: { groups: DepartmentGroup[]; accountEmailsSentThisWeek?: number } = {
      groups: result,
    };
    if (includeEmailActivity) {
      payload.accountEmailsSentThisWeek = accountEmailsSentThisWeek;
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/companies/[companyId]/contacts/by-department error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts by department' },
      { status: 500 }
    );
  }
}
