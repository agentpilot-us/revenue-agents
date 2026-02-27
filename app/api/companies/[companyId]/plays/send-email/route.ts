/**
 * POST /api/companies/[companyId]/plays/send-email
 *
 * Sends an email to a contact via Gmail MCP and logs the activity.
 *
 * Body: { contactId: string, subject: string, body: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkCanSendToContact } from '@/lib/outreach/limits';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

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

    // Send via Gmail MCP
    const response = await anthropic.beta.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      mcp_servers: [
        {
          type: 'url',
          url: 'https://gmail.mcp.claude.com/mcp',
          name: 'gmail-mcp',
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Send an email using Gmail with these exact details:

To: ${toName} <${toAddress}>
Subject: ${body.subject}
Body:
${body.body}

Send this email now. Return only "sent" when complete.`,
        },
      ],
    } as Parameters<typeof anthropic.beta.messages.create>[0]);

    // Non-streaming response: BetaMessage with content array (Stream not used here)
    type MessageResponse = { content: Array<{ type: string; text?: string }> };
    const message = response as MessageResponse;

    const responseText = message.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('');

    const succeeded =
      responseText.toLowerCase().includes('sent') ||
      responseText.toLowerCase().includes('success') ||
      message.content.some((c) => c.type === 'mcp_tool_result');

    if (!succeeded) {
      console.error('Gmail MCP send response:', responseText);
      return NextResponse.json(
        {
          error: 'Email send may have failed',
          details: responseText,
        },
        { status: 502 }
      );
    }

    // Log activity (schema: summary, content, type; store messageId in metadata when available for tracking)
    const activitySummary = `Email sent to ${toName} (${toAddress}): ${body.subject}`;
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
            channel: 'gmail_mcp',
            sentVia: 'plays_run',
          },
          agentUsed: 'plays',
        },
      })
      .catch((e) => {
        console.warn('Activity log failed:', e);
        return null;
      });

    // Update contact for lastActivity / Re-Engagement loop
    await prisma.contact
      .update({
        where: { id: contact.id },
        data: {
          lastEmailSentAt: new Date(),
          totalEmailsSent: { increment: 1 },
        },
      })
      .catch((e) => {
        console.warn('Contact update failed:', e);
      });

    // Log to Salesforce when user has connected Salesforce and contact has salesforceId
    if (activity && contact.salesforceId) {
      try {
        const { pushActivityToSalesforceForUser } = await import(
          '@/lib/integrations/salesforce-push-activity'
        );
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { salesforceAccessToken: true },
        });
        if (user?.salesforceAccessToken) {
          const sfResult = await pushActivityToSalesforceForUser({
            userId: session.user.id,
            contactSalesforceId: contact.salesforceId,
            type: 'email',
            subject: body.subject,
            body: body.body,
            summary: activitySummary,
            createdAt: new Date(),
          });
          if (!sfResult.ok) {
            console.warn('Salesforce push failed:', sfResult.error);
          }
        }
      } catch (e) {
        console.warn('Salesforce push error:', e);
      }
    }

    return NextResponse.json({ success: true, sent: true, to: toAddress });
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
