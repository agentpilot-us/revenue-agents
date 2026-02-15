import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { crmPush, crmPushSegments, isCrmConfigured } from '@/lib/crm';
import { z } from 'zod';

const bodySchema = z.object({
  crmSource: z.enum(['salesforce', 'hubspot']),
  companyId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
  scope: z.enum(['activities', 'all', 'segments']).optional(),
  sinceDays: z.number().int().min(1).max(365).optional(),
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

    const { crmSource, companyId, contactIds, scope, sinceDays } = parsed.data;

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

    const scopeChoice = scope ?? 'activities';

    if (scopeChoice === 'segments') {
      if (crmSource !== 'salesforce') {
        return NextResponse.json({ error: 'Segment push is only supported for Salesforce' }, { status: 400 });
      }
      if (!companyId) {
        return NextResponse.json({ error: 'companyId is required when scope is segments' }, { status: 400 });
      }
      const result = await crmPushSegments(prisma, { userId: session.user.id, companyId });
      return NextResponse.json({
        ok: true,
        pushed: result.pushed,
        errors: result.errors.slice(0, 50),
      });
    }

    const since = sinceDays
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() - sinceDays);
          return d;
        })()
      : undefined;

    const result = await crmPush(prisma, {
      crmSource,
      companyId,
      contactIds,
      scope: scopeChoice,
      since,
    });

    return NextResponse.json({
      ok: true,
      pushed: result.pushed,
      errors: result.errors.slice(0, 50),
    });
  } catch (e) {
    console.error('POST /api/crm/push', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Push failed' },
      { status: 500 }
    );
  }
}
