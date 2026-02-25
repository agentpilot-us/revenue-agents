import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';

/** Map job title keywords to department types for suggesting buying group assignment. */
function suggestDepartmentTypeFromTitle(title: string | null): DepartmentType | null {
  if (!title || !title.trim()) return null;
  const t = title.toLowerCase();
  if (/\b(ceo|chief executive|coo|chief operating|cfo|chief financial)\b/.test(t)) return DepartmentType.EXECUTIVE_LEADERSHIP;
  if (/\b(cto|vp engineering|vice president engineering|technical director|head of engineering)\b/.test(t)) return DepartmentType.ENGINEERING;
  if (/\b(revops|revenue operations|head of rev ops)\b/.test(t)) return DepartmentType.REVENUE_OPERATIONS;
  if (/\b(head of strategic accounts|strategic accounts|sales operations|sales ops)\b/.test(t)) return DepartmentType.SALES;
  if (/\b(customer success|cs manager|head of customer success)\b/.test(t)) return DepartmentType.CUSTOMER_SUCCESS;
  if (/\b(marketing|cmo|head of marketing)\b/.test(t)) return DepartmentType.MARKETING;
  if (/\b(product manager|head of product|vp product)\b/.test(t)) return DepartmentType.PRODUCT;
  if (/\b(engineer|developer|technical)\b/.test(t)) return DepartmentType.ENGINEERING;
  if (/\b(sales|account executive|ae)\b/.test(t)) return DepartmentType.SALES;
  if (/\b(finance|fp&a)\b/.test(t)) return DepartmentType.FINANCE;
  return null;
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
      select: { id: true, type: true, customName: true },
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
      const suggestedType = suggestDepartmentTypeFromTitle(c.title);
      const dept = suggestedType
        ? departments.find((d) => d.type === suggestedType) ?? departments[0]
        : departments[0];
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
