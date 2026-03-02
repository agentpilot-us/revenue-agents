import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function mapSeniority(
  seniority: string | null,
  seniorityLevel: number | null
): { levelRank: number; levelLabel: string } {
  if (seniorityLevel != null) {
    if (seniorityLevel <= 0) return { levelRank: 0, levelLabel: 'C-Suite' };
    if (seniorityLevel === 1) return { levelRank: 1, levelLabel: 'VP' };
    if (seniorityLevel === 2) return { levelRank: 2, levelLabel: 'Director' };
    if (seniorityLevel === 3) return { levelRank: 3, levelLabel: 'Manager' };
  }

  const s = (seniority ?? '').toLowerCase();
  if (s.includes('chief') || s.includes('c-suite') || s.startsWith('cfo') || s.startsWith('ceo')) {
    return { levelRank: 0, levelLabel: 'C-Suite' };
  }
  if (s.includes('vp') || s.includes('vice president')) {
    return { levelRank: 1, levelLabel: 'VP' };
  }
  if (s.includes('director')) {
    return { levelRank: 2, levelLabel: 'Director' };
  }
  if (s.includes('manager') || s.includes('head')) {
    return { levelRank: 3, levelLabel: 'Manager' };
  }
  return { levelRank: 4, levelLabel: 'IC' };
}

function mapEngagement(
  engagementScore: number | null,
  totalEmailsSent: number,
  isResponsive: boolean
): 'active' | 'warm' | 'cold' | 'new' {
  if (isResponsive || (engagementScore ?? 0) >= 60) return 'active';
  if ((engagementScore ?? 0) >= 30 || totalEmailsSent > 0) return 'warm';
  if (totalEmailsSent === 0 && (engagementScore ?? 0) > 0) return 'cold';
  return 'new';
}

// GET /api/companies/[companyId]/divisions/[divisionId]/contacts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string; divisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, divisionId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const department = await prisma.companyDepartment.findFirst({
      where: { id: divisionId, companyId },
      select: { id: true },
    });
    if (!department) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        companyId,
        companyDepartmentId: divisionId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        email: true,
        linkedinUrl: true,
        seniority: true,
        seniorityLevel: true,
        engagementScore: true,
        totalEmailsSent: true,
        isResponsive: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const items = contacts.map((c) => {
      const name =
        `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || 'Unknown contact';
      const { levelRank, levelLabel } = mapSeniority(c.seniority, c.seniorityLevel);
      const engagement = mapEngagement(
        c.engagementScore ?? null,
        c.totalEmailsSent ?? 0,
        c.isResponsive ?? false
      );

      return {
        id: c.id,
        name,
        title: c.title,
        email: c.email,
        linkedin: !!c.linkedinUrl,
        seniority: c.seniority,
        levelRank,
        levelLabel,
        engagement,
      };
    });

    return NextResponse.json({ contacts: items });
  } catch (error) {
    console.error(
      'GET /api/companies/[companyId]/divisions/[divisionId]/contacts error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch contacts for division' },
      { status: 500 }
    );
  }
}

