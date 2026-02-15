import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { enrichContact } from '@/lib/tools/clay';

const MAX_PER_REQUEST = 10;

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
      select: { id: true, domain: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const pending = await prisma.contact.findMany({
      where: { companyId, enrichmentStatus: 'pending' },
      take: MAX_PER_REQUEST,
      select: { id: true, email: true, linkedinUrl: true, firstName: true, lastName: true },
    });

    let enriched = 0;
    let failed = 0;

    for (const c of pending) {
      await prisma.contact.update({
        where: { id: c.id },
        data: { enrichmentStatus: 'enriching' },
      });

      const result = await enrichContact({
        email: c.email ?? undefined,
        linkedinUrl: c.linkedinUrl ?? undefined,
        domain: company.domain ?? undefined,
      });

      if (result.ok) {
        await prisma.contact.update({
          where: { id: c.id },
          data: {
            enrichmentStatus: 'complete',
            enrichedAt: new Date(),
            enrichedData: result.data as object,
            ...(result.data.email ? { email: String(result.data.email) } : {}),
            ...(result.data.phone ? { phone: String(result.data.phone) } : {}),
            ...(result.data.title ? { title: String(result.data.title) } : {}),
          },
        });
        enriched++;
      } else {
        await prisma.contact.update({
          where: { id: c.id },
          data: {
            enrichmentStatus: 'failed',
            enrichedAt: new Date(),
            enrichedData: { error: result.error },
          },
        });
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: pending.length,
      enriched,
      failed,
    });
  } catch (e) {
    console.error('enrich-pending', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
