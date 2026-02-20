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
    const result = departments.map((dept) => ({
      department: {
        id: dept.id,
        name: dept.customName || dept.type.replace(/_/g, ' '),
        type: dept.type,
        targetRoles: dept.targetRoles,
      },
      contacts: (contactsByDept[dept.id] || []).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        email: c.email,
        linkedinUrl: c.linkedinUrl,
        personaName: c.persona?.name ?? null,
        enrichmentStatus: c.enrichmentStatus,
        isWarm: c.email ? warmEmails.has(c.email) : false,
        buyingRole: c.persona?.name ?? null, // Could be enhanced to match persona to department targetRoles
      })),
    }));

    // Add unassigned contacts
    if (unassignedContacts.length > 0) {
      result.push({
        department: {
          id: null as string | null,
          name: 'Unassigned',
          type: null as string | null,
          targetRoles: null,
        },
        contacts: unassignedContacts.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          email: c.email,
          linkedinUrl: c.linkedinUrl,
          personaName: c.persona?.name ?? null,
          enrichmentStatus: c.enrichmentStatus,
          isWarm: c.email ? warmEmails.has(c.email) : false,
          buyingRole: c.persona?.name ?? null,
        })),
      });
    }

    return NextResponse.json({ groups: result });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/contacts/by-department error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts by department' },
      { status: 500 }
    );
  }
}
