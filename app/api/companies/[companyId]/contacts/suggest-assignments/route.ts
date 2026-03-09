import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type DeptRow = {
  id: string;
  type: string;
  customName: string | null;
  searchKeywords: unknown;
};

/**
 * Score how well a contact title matches a department using customName,
 * searchKeywords, and the enum type as a loose fallback. Higher = better match.
 */
function scoreDeptMatch(title: string, dept: DeptRow): number {
  const lower = title.toLowerCase();
  let score = 0;

  if (dept.customName) {
    const cn = dept.customName.toLowerCase();
    const words = cn.split(/\s+/);
    for (const w of words) {
      if (w.length >= 3 && lower.includes(w)) score += 3;
    }
  }

  const keywords = Array.isArray(dept.searchKeywords) ? dept.searchKeywords as string[] : [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += 2;
  }

  const typeLabel = dept.type.toLowerCase().replace(/_/g, ' ');
  const typeWords = typeLabel.split(/\s+/);
  for (const w of typeWords) {
    if (w.length >= 3 && lower.includes(w)) score += 1;
  }

  return score;
}

function suggestDepartment(title: string | null, departments: DeptRow[]): DeptRow | null {
  if (!title?.trim() || departments.length === 0) return departments[0] ?? null;

  let best: DeptRow | null = null;
  let bestScore = 0;

  for (const dept of departments) {
    const s = scoreDeptMatch(title, dept);
    if (s > bestScore) {
      best = dept;
      bestScore = s;
    }
  }

  return best ?? departments[0];
}

export async function POST(
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
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const unassigned = await prisma.contact.findMany({
      where: { companyId, companyDepartmentId: null },
      select: { id: true, firstName: true, lastName: true, title: true },
    });

    const departments = await prisma.companyDepartment.findMany({
      where: { companyId },
      select: { id: true, type: true, customName: true, searchKeywords: true },
      orderBy: { createdAt: 'asc' },
    });

    const suggestions: Array<{
      contactId: string;
      contactName: string;
      title: string | null;
      suggestedDepartmentId: string;
      suggestedDepartmentName: string;
    }> = [];

    for (const c of unassigned) {
      const dept = suggestDepartment(c.title, departments);
      if (!dept) continue;
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
      suggestions.push({
        contactId: c.id,
        contactName: name,
        title: c.title,
        suggestedDepartmentId: dept.id,
        suggestedDepartmentName: dept.customName || dept.type.replace(/_/g, ' '),
      });
    }

    const departmentOptions = departments.map((d) => ({
      id: d.id,
      name: d.customName || d.type.replace(/_/g, ' '),
    }));

    return NextResponse.json({ suggestions, departmentOptions });
  } catch (error) {
    console.error('POST suggest-assignments error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest assignments' },
      { status: 500 }
    );
  }
}
