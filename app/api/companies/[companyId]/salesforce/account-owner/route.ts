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
      return NextResponse.json({ error: 'Salesforce not connected' }, { status: 404 });
    }

    const accessToken = await getSalesforceAccessToken(session.user.id);
    const instanceUrl = await getSalesforceInstanceUrl(session.user.id);

    // Query Account owner
    const accountQuery = `SELECT Id, Owner.Name, Owner.Email FROM Account WHERE Id = '${company.salesforceId}' LIMIT 1`;
    const accountRes = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(accountQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!accountRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch account owner' },
        { status: accountRes.status }
      );
    }

    const accountData = await accountRes.json();
    if (!accountData.records || accountData.records.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = accountData.records[0];
    const ownerName = account.Owner?.Name || null;

    return NextResponse.json({ owner: ownerName });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/salesforce/account-owner error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account owner' },
      { status: 500 }
    );
  }
}
