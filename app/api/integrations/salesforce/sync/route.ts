import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { fetchSalesforceOpportunityData } from '@/lib/integrations/salesforce-opportunities';

const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = body.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Get company with Salesforce ID
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: session.user.id,
        salesforceId: { not: null },
      },
      select: {
        id: true,
        salesforceId: true,
        salesforceLastSyncedAt: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found or not linked to Salesforce' },
        { status: 404 }
      );
    }

    if (!company.salesforceId) {
      return NextResponse.json(
        { error: 'Company is not linked to a Salesforce Account' },
        { status: 400 }
      );
    }

    // Check cache
    const now = new Date();
    const lastSynced = company.salesforceLastSyncedAt;
    const shouldSync = !lastSynced || (now.getTime() - lastSynced.getTime()) > CACHE_DURATION_MS;

    if (!shouldSync) {
      // Return cached data
      const cachedCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          salesforceOpportunityData: true,
          salesforceLastSyncedAt: true,
        },
      });

      return NextResponse.json({
        cached: true,
        lastSyncedAt: cachedCompany?.salesforceLastSyncedAt,
        opportunityData: cachedCompany?.salesforceOpportunityData,
      });
    }

    // Fetch fresh data
    const opportunityData = await fetchSalesforceOpportunityData(
      session.user.id,
      company.salesforceId
    );

    // Update company with fresh data
    await prisma.company.update({
      where: { id: companyId },
      data: {
        salesforceOpportunityData: opportunityData ? (opportunityData as unknown as object) : null,
        salesforceLastSyncedAt: now,
      },
    });

    return NextResponse.json({
      cached: false,
      lastSyncedAt: now,
      opportunityData,
    });
  } catch (error) {
    console.error('Salesforce sync error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync Salesforce data',
      },
      { status: 500 }
    );
  }
}
