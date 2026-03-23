import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { companyId } = await params;
    const userId = session.user.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      company,
      departments,
      contacts,
      playRuns,
      signals,
      recentActivities,
      companyProducts,
    ] = await Promise.all([
      prisma.company.findFirst({
        where: { id: companyId, userId },
        select: {
          id: true,
          name: true,
          domain: true,
          industry: true,
          website: true,
          employees: true,
          headquarters: true,
          revenue: true,
          businessOverview: true,
          dealObjective: true,
          keyInitiatives: true,
          activeObjections: true,
          segmentationStrategy: true,
          researchData: true,
        },
      }),

      prisma.companyDepartment.findMany({
        where: { companyId },
        include: {
          _count: { select: { contacts: true } },
          companyProducts: {
            include: { product: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      prisma.contact.findMany({
        where: { companyId },
        orderBy: [{ engagementScore: 'desc' }, { lastContactedAt: 'desc' }],
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
          seniority: true,
          engagementScore: true,
          lastContactedAt: true,
          companyDepartmentId: true,
          companyDepartment: {
            select: { customName: true, type: true },
          },
        },
      }),

      prisma.playRun.findMany({
        where: { companyId, userId, status: 'ACTIVE' },
        orderBy: { activatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          activatedAt: true,
          playTemplate: { select: { name: true } },
          _count: { select: { phaseRuns: true } },
        },
      }),

      prisma.accountSignal.findMany({
        where: { companyId, publishedAt: { gte: thirtyDaysAgo } },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          publishedAt: true,
          relevanceScore: true,
          suggestedPlay: true,
          status: true,
        },
      }),

      prisma.activity.findMany({
        where: {
          companyId,
          userId,
          type: { in: ['EMAIL_SENT', 'Email', 'LINKEDIN_DRAFTED', 'Meeting'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          type: true,
          summary: true,
          createdAt: true,
          contactId: true,
          contact: { select: { firstName: true, lastName: true } },
        },
      }),

      prisma.companyProduct.findMany({
        where: { companyId },
        include: { product: { select: { name: true } } },
        orderBy: { status: 'asc' },
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      company,
      departments,
      contacts,
      workflows: [],
      playRuns,
      signals,
      recentActivities,
      companyProducts,
    });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/workspace error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace data' },
      { status: 500 },
    );
  }
}
