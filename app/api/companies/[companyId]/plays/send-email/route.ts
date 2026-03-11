/**
 * POST /api/companies/[companyId]/plays/send-email
 *
 * Creates a Gmail draft for a contact and logs the activity.
 *
 * Body: { contactId: string, subject: string, body: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkCanSendToContact } from '@/lib/outreach/limits';
import { createGmailDraft } from '@/lib/integrations/google-workspace-tools';

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
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let body: { contactId?: string; subject?: string; body?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.contactId || !body.subject || !body.body) {
      return NextResponse.json(
        { error: 'contactId, subject, and body are required' },
        { status: 400 }
      );
    }

    // Load contact (include salesforceId for CRM log)
    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        companyDepartmentId: true,
        salesforceId: true,
      },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    if (!contact.email) {
      return NextResponse.json(
        { error: 'Contact has no email address' },
        { status: 400 }
      );
    }

    const toName = [contact.firstName, contact.lastName]
      .filter(Boolean)
      .join(' ');
    const toAddress = contact.email;

    const limitCheck = await checkCanSendToContact(companyId, contact.id);
    if (!limitCheck.ok) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 429 });
    }

    const draft = await createGmailDraft({
      userId: session.user.id,
      to: toAddress,
      subject: body.subject,
      body: body.body,
    });

    // Log activity (schema: summary, content, type; store messageId in metadata when available for tracking)
    const activitySummary = `Gmail draft created for ${toName} (${toAddress}): ${body.subject}`;
    const activity = await prisma.activity
      .create({
        data: {
          companyId,
          userId: session.user.id,
          contactId: contact.id,
          companyDepartmentId: contact.companyDepartmentId,
          type: 'Email',
          summary: activitySummary,
          content: body.body,
          subject: body.subject,
          body: body.body,
          metadata: {
            to: toAddress,
            toName,
            sentAt: new Date().toISOString(),
            channel: 'gmail_draft',
            sentVia: 'plays_run',
            draftUrl: draft.url,
          },
          agentUsed: 'plays',
        },
      })
      .catch((e) => {
        console.warn('Activity log failed:', e);
        return null;
      });

    return NextResponse.json({
      success: true,
      drafted: true,
      to: toAddress,
      draftUrl: draft.url,
    });
  } catch (error: unknown) {
    console.error('send-email error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
