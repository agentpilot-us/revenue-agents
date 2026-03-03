import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { crmImportContacts } from '@/lib/crm';
import { salesforceFetchAccountById } from '@/lib/crm/salesforce';
import { z } from 'zod';

const bodySchema = z.object({
  salesforceAccountId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { salesforceAccountId } = parsed.data;
    const userId = session.user.id;

    const sfAccount = await salesforceFetchAccountById(salesforceAccountId, userId);
    if (!sfAccount) {
      return NextResponse.json({ error: 'Account not found in Salesforce' }, { status: 404 });
    }

    let domain: string | null = null;
    if (sfAccount.website) {
      try {
        const raw = sfAccount.website.startsWith('http') ? sfAccount.website : `https://${sfAccount.website}`;
        domain = new URL(raw).hostname.replace(/^www\./, '');
      } catch { /* invalid URL */ }
    }

    // 1. Match by salesforceId
    let company = await prisma.company.findFirst({
      where: { userId, salesforceId: salesforceAccountId },
      select: { id: true, name: true },
    });

    // 2. Match by domain
    if (!company && domain) {
      company = await prisma.company.findFirst({
        where: { userId, domain },
        select: { id: true, name: true },
      });
      if (company) {
        await prisma.company.update({
          where: { id: company.id },
          data: { salesforceId: salesforceAccountId, crmSource: 'salesforce' },
        });
      }
    }

    // 3. Create new company
    if (!company) {
      company = await prisma.company.create({
        data: {
          userId,
          name: sfAccount.name,
          domain,
          website: sfAccount.website,
          crmSource: 'salesforce',
          salesforceId: salesforceAccountId,
        },
        select: { id: true, name: true },
      });
    }

    await crmImportContacts(prisma, userId, {
      crmSource: 'salesforce',
      companyId: company.id,
      accountId: salesforceAccountId,
      limit: 200,
    });

    return NextResponse.json({ id: company.id, name: company.name });
  } catch (e) {
    console.error('POST /api/crm/accounts/import', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 500 }
    );
  }
}
