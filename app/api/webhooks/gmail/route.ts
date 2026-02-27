/**
 * POST /api/webhooks/gmail
 *
 * Gmail MCP (or tracking provider) POSTs here on opens, clicks, replies.
 * Payload: { messageId: string, event: 'opened' | 'clicked' | 'replied', timestamp?: string, fromEmail?: string, subject?: string }
 *
 * Matching: by gmailMessageId, then metadata.messageId, then by fromEmail + subject + recent (7 days).
 * Updates Activity (emailOpenedAt, emailOpenCount, emailClickedAt) and on reply
 * creates EmailReply activity and sends Slack notification when user has slackWebhookUrl.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { sendSlackAlert } from '@/lib/alerts/channels/slack';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageId = body.messageId ?? body.message_id;
    const event = (body.event ?? body.type ?? '').toLowerCase();
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    const fromEmail = (body.fromEmail ?? body.from_email ?? body.recipient ?? '').toString().trim().toLowerCase();
    const subject = (body.subject ?? '').toString().trim();

    if (!event) {
      return NextResponse.json(
        { error: 'event required' },
        { status: 400 }
      );
    }

    // Build OR conditions: messageId first, then metadata.messageId, then email+subject+recent
    const orConditions: Prisma.ActivityWhereInput[] = [];

    if (messageId) {
      orConditions.push({ gmailMessageId: messageId });
      orConditions.push({
        metadata: { path: ['messageId'], equals: messageId },
      });
    }

    if (fromEmail && subject) {
      orConditions.push({
        AND: [
          { contact: { email: fromEmail } },
          { subject },
          { type: 'Email' },
          { createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) } },
        ],
      });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ received: true, warning: 'Activity not found (provide messageId or fromEmail+subject)' });
    }

    const activity = await prisma.activity.findFirst({
      where: { OR: orConditions },
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        company: { select: { id: true, name: true, user: { select: { id: true, slackWebhookUrl: true } } } },
      },
    });

    if (!activity) {
      return NextResponse.json({ received: true, warning: 'Activity not found' });
    }

    if (event === 'opened') {
      const newCount = (activity.emailOpenCount ?? 0) + 1;
      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          emailOpenedAt: activity.emailOpenedAt ?? timestamp,
          emailOpenCount: newCount,
        },
      });
      if (newCount >= 2 && activity.company?.user?.slackWebhookUrl && activity.contact) {
        const name = [activity.contact.firstName, activity.contact.lastName].filter(Boolean).join(' ') || activity.contact.email || 'Contact';
        await sendSlackAlert({
          webhookUrl: activity.company.user.slackWebhookUrl,
          title: 'High engagement',
          message: `${name} opened email 2x — hot lead!`,
          data: { contactId: activity.contactId, companyId: activity.companyId },
          alertId: '',
        }).catch(() => {});
      }
    } else if (event === 'clicked') {
      await prisma.activity.update({
        where: { id: activity.id },
        data: { emailClickedAt: timestamp },
      });
    } else if (event === 'replied') {
      await prisma.activity.create({
        data: {
          companyId: activity.companyId,
          contactId: activity.contactId,
          userId: activity.userId,
          companyDepartmentId: activity.companyDepartmentId,
          type: 'EmailReply',
          summary: `${activity.contact?.firstName ?? ''} ${activity.contact?.lastName ?? ''} replied to your email`.trim() || 'Email reply received',
          metadata: { originalMessageId: messageId ?? null, inReplyToActivityId: activity.id },
        },
      });
      if (activity.company?.user?.slackWebhookUrl && activity.contact) {
        const name = [activity.contact.firstName, activity.contact.lastName].filter(Boolean).join(' ') || activity.contact.email || 'Contact';
        await sendSlackAlert({
          webhookUrl: activity.company.user.slackWebhookUrl,
          title: 'Email reply',
          message: `${name} replied to your email!`,
          data: { contactId: activity.contactId, companyId: activity.companyId },
          alertId: '',
        }).catch(() => {});
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Gmail webhook error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
