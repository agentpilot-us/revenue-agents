import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getSalesforceAccessToken, getSalesforceInstanceUrl } from '@/lib/integrations/salesforce-oauth';

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
        salesforceId: true,
        user: {
          select: {
            salesforceAccessToken: true,
          },
        },
      },
    });

    if (!company || !company.salesforceId || !company.user.salesforceAccessToken) {
      return NextResponse.json({ activities: [] });
    }

    const accessToken = await getSalesforceAccessToken(session.user.id);
    const instanceUrl = await getSalesforceInstanceUrl(session.user.id);

    // Query Tasks and Events
    const activitiesQuery = `
      SELECT Id, Subject, Type, ActivityDate, LastModifiedDate, Status, Description, WhoId, WhatId
      FROM Task
      WHERE WhatId = '${company.salesforceId}' OR AccountId = '${company.salesforceId}'
      ORDER BY LastModifiedDate DESC
      LIMIT 50
    `;

    const activitiesRes = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(activitiesQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!activitiesRes.ok) {
      return NextResponse.json({ activities: [] });
    }

    const activitiesData = await activitiesRes.json();
    const activities = (activitiesData.records || []).map((record: any) => ({
      id: record.Id,
      type: record.Type || 'Task',
      subject: record.Subject,
      summary: record.Subject || record.Description || '',
      createdDate: record.ActivityDate || record.LastModifiedDate,
      lastModifiedDate: record.LastModifiedDate,
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/salesforce/activities error:', error);
    return NextResponse.json({ activities: [] });
  }
}
