import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
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
        researchData: true,
        accountMessaging: { select: { id: true } },
        _count: {
          select: { departments: true, contacts: true, segmentCampaigns: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const hasCompletedAccountIntelligence =
      !!company.researchData &&
      (company._count?.departments ?? 0) > 0 &&
      !!company.accountMessaging;
    const hasContacts = (company._count?.contacts ?? 0) > 0;
    const hasLaunchedCampaign = (company._count?.segmentCampaigns ?? 0) > 0;

    const activeEnrollmentCount = await prisma.contactSequenceEnrollment.count({
      where: {
        contact: { companyId },
        status: 'active',
      },
    });
    const hasActiveSequences = activeEnrollmentCount > 0;

    const currentStep: 1 | 2 = !hasCompletedAccountIntelligence ? 1 : 2;

    return NextResponse.json({
      hasCompletedAccountIntelligence,
      hasContacts,
      hasLaunchedCampaign,
      hasActiveSequences,
      currentStep,
    });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
