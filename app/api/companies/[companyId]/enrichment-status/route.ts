/**
 * GET /api/companies/[companyId]/enrichment-status
 * Poll after company creation to see when Exa enrichment (signals + contacts) is complete.
 */

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
        id: true,
        name: true,
        employees: true,
        researchData: true,
        exaEnrichmentStartedAt: true,
        exaEnrichmentCompletedAt: true,
        _count: { select: { accountSignals: true, contacts: true } },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const complete = !!company.exaEnrichmentCompletedAt;
    const signalsFound = company._count.accountSignals ?? 0;
    const contactsFound = company._count.contacts ?? 0;

    if (!complete) {
      return NextResponse.json({
        complete: false,
        companyId: company.id,
        companyName: company.name,
        status: company.exaEnrichmentStartedAt ? 'researching' : 'pending',
        signalsFound: 0,
        contactsFound: 0,
      });
    }

    // Enrichment complete: return summary + top signals and contacts for success screen
    const [signals, topContacts] = await Promise.all([
      prisma.accountSignal.findMany({
        where: { companyId },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { id: true, type: true, title: true, summary: true, url: true, publishedAt: true },
      }),
      prisma.contact.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          email: true,
          linkedinUrl: true,
        },
      }),
    ]);

    return NextResponse.json({
      complete: true,
      companyId: company.id,
      companyName: company.name,
      status: 'complete',
      signalsFound,
      contactsFound,
      employeeCount: company.employees ?? null,
      signals: signals.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        summary: s.summary,
        url: s.url,
        publishedAt: s.publishedAt.toISOString(),
      })),
      topContacts: topContacts.map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
        title: c.title,
        email: c.email,
        linkedinUrl: c.linkedinUrl,
      })),
    });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/enrichment-status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get enrichment status' },
      { status: 500 }
    );
  }
}
