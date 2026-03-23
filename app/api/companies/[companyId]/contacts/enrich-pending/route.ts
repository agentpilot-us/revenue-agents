import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { enrichContact } from '@/lib/tools/enrich-contact';
import { generateWhyRelevant } from '@/lib/contacts/why-relevant';

const MAX_PER_REQUEST = 10;

// Processes pending contacts: optionally only the given contactIds (for "Enrich now" on one row),
// otherwise up to MAX_PER_REQUEST company-wide. Includes contacts with null or 'pending' status
// so seeded demo contacts (null) are enrichable without pre-setting 'pending'.

export async function POST(
  req: NextRequest,
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
      select: { id: true, name: true, domain: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({})) as { contactIds?: string[] };
    const contactIds = Array.isArray(body?.contactIds) ? body.contactIds : undefined;

    const pending = await prisma.contact.findMany({
      where: {
        companyId,
        ...(contactIds?.length
          ? { id: { in: contactIds } }
          : {}),
        OR: [
          { enrichmentStatus: null },
          { enrichmentStatus: 'pending' },
        ],
      },
      take: contactIds?.length ? contactIds.length : MAX_PER_REQUEST,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        linkedinUrl: true,
        firstName: true,
        lastName: true,
        title: true,
        companyDepartmentId: true,
      },
    });

    let enriched = 0;
    let failed = 0;
    const updatedContacts: Array<{ id: string; email: string | null; title: string | null; linkedinUrl: string | null; enrichmentStatus: string }> = [];

    for (const c of pending) {
      await prisma.contact.update({
        where: { id: c.id },
        data: { enrichmentStatus: 'enriching' },
      });

      const result = await enrichContact({
        email: c.email ?? undefined,
        linkedinUrl: c.linkedinUrl ?? undefined,
        domain: company.domain ?? undefined,
        firstName: c.firstName ?? undefined,
        lastName: c.lastName ?? undefined,
        organizationName: company.name,
      });

      if (result.ok) {
        const enrichedData = result.data as Record<string, unknown>;
        let whyRelevant: string | undefined;
        if (c.companyDepartmentId) {
          try {
            const dept = await prisma.companyDepartment.findUnique({
              where: { id: c.companyDepartmentId },
              select: { customName: true, type: true, valueProp: true, useCase: true },
            });
            if (dept) {
              whyRelevant = await generateWhyRelevant({
                contactTitle: (result.data?.title as string) ?? c.title ?? '',
                departmentName: dept.customName ?? dept.type.replace(/_/g, ' '),
                companyName: company.name,
                valueProp: dept.valueProp ?? null,
                useCase: dept.useCase ?? null,
              });
            }
          } catch {
            // optional
          }
        }
        if (whyRelevant) {
          enrichedData.whyRelevant = whyRelevant;
        }
        // Persist Apollo data so the UI shows real email/LinkedIn after refresh.
        // When Apollo doesn't return email, clear placeholder so we don't show fake data.
        const updateData: {
          enrichmentStatus: 'complete';
          enrichedAt: Date;
          enrichedData: object;
          email?: string | null;
          phone?: string | null;
          title?: string | null;
          linkedinUrl?: string | null;
        } = {
          enrichmentStatus: 'complete',
          enrichedAt: new Date(),
          enrichedData: enrichedData as object,
        };
        if (result.data.email != null && String(result.data.email).trim() !== '') {
          updateData.email = String(result.data.email).trim();
        } else {
          // Clear placeholder so enriched contacts don't show fake @gm-demo email
          updateData.email = null;
        }
        if (result.data.phone != null && String(result.data.phone).trim() !== '') {
          updateData.phone = String(result.data.phone).trim();
        }
        if (result.data.title != null && String(result.data.title).trim() !== '') {
          updateData.title = String(result.data.title).trim();
        }
        if (result.data.linkedinUrl != null && String(result.data.linkedinUrl).trim() !== '') {
          updateData.linkedinUrl = String(result.data.linkedinUrl).trim();
        }
        await prisma.contact.update({
          where: { id: c.id },
          data: updateData,
        });
        updatedContacts.push({
          id: c.id,
          email: updateData.email ?? null,
          title: updateData.title ?? null,
          linkedinUrl: updateData.linkedinUrl ?? null,
          enrichmentStatus: 'complete',
        });
        enriched++;
      } else {
        console.warn('[enrich-pending] Apollo enrichment failed', {
          contactId: c.id,
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || undefined,
          error: result.error,
        });
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
      updatedContacts: updatedContacts.length > 0 ? updatedContacts : undefined,
    });
  } catch (e) {
    console.error('enrich-pending', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
