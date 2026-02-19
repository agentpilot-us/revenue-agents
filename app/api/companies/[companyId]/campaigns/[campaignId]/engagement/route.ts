import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string; campaignId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, campaignId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const campaign = await prisma.segmentCampaign.findFirst({
      where: { id: campaignId, companyId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get visits
    const visits = await prisma.campaignVisit.findMany({
      where: { campaignId },
      select: {
        visitorEmail: true,
        chatMessages: true,
        ctaClicked: true,
      },
    });

    const totalVisits = visits.length;
    const uniqueVisitors = new Set(visits.map((v) => v.visitorEmail).filter(Boolean)).size;
    const chatMessages = visits.reduce((sum, v) => sum + (v.chatMessages || 0), 0);
    const ctaClicks = visits.filter((v) => v.ctaClicked).length;

    return NextResponse.json({
      totalVisits,
      uniqueVisitors,
      chatMessages,
      ctaClicks,
    });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/campaigns/[campaignId]/engagement error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement metrics' },
      { status: 500 }
    );
  }
}
