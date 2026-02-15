import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { crmImportContacts, isCrmConfigured } from '@/lib/crm';
import { z } from 'zod';

const bodySchema = z.object({
  crmSource: z.enum(['salesforce', 'hubspot']),
  companyId: z.string().optional(),
  accountId: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
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

    const { crmSource, companyId, accountId, limit } = parsed.data;
    if (!companyId && !accountId) {
      return NextResponse.json({ error: 'companyId or accountId is required' }, { status: 400 });
    }

    if (!isCrmConfigured(crmSource)) {
      return NextResponse.json(
        { error: `${crmSource} is not configured. Set the required environment variables.` },
        { status: 503 }
      );
    }

    if (companyId) {
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        select: { id: true },
      });
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    const result = await crmImportContacts(prisma, session.user.id, {
      crmSource,
      companyId,
      accountId,
      limit: limit ?? 100,
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      updated: result.updated,
      errors: result.errors.slice(0, 50),
    });
  } catch (e) {
    console.error('POST /api/crm/import', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 500 }
    );
  }
}
