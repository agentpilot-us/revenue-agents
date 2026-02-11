import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Resend webhook – email events (sent, delivered, opened, clicked, bounced, complained).
 * Optionally verify with RESEND_WEBHOOK_SECRET (svix-signature or resend-signature header).
 *
 * Payload shape:
 * {
 *   type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained',
 *   created_at: '2024-01-01T00:00:00.000Z',
 *   data: {
 *     email_id: 're_...',
 *     from: '...',
 *     to: ['contact@example.com'],
 *     subject: '...',
 *     ...
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('svix-signature') ?? req.headers.get('resend-signature') ?? '';
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (secret && signature) {
      // Optional: verify Svix/Resend signature when you implement verifySignature
      // const isValid = verifySignature(body, signature, secret);
      // if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      type?: string;
      data?: { email_id?: string; [k: string]: unknown };
    };
    const eventType = payload.type ?? (payload as { event?: string }).event;
    const data = payload.data;

    if (!data?.email_id) {
      console.log('Resend webhook missing data.email_id');
      return NextResponse.json({ received: true });
    }

    console.log('Resend webhook received:', eventType);

    const activity = await prisma.activity.findFirst({
      where: { resendEmailId: data.email_id as string },
      include: { contact: true },
    });

    if (!activity || !activity.contact) {
      console.log('Activity or contact not found for email:', data.email_id);
      return NextResponse.json({ received: true });
    }

    const contactId = activity.contactId!;
    const contact = activity.contact;
    const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Contact';

    switch (eventType) {
      case 'email.opened':
        await prisma.contact.update({
          where: { id: contactId },
          data: {
            lastEmailOpenedAt: new Date(),
            totalEmailsOpened: { increment: 1 },
          },
        });
        await prisma.activity.create({
          data: {
            type: 'EmailOpen',
            summary: `${displayName} opened email`,
            companyId: activity.companyId,
            contactId,
            userId: activity.userId,
          },
        });
        break;

      case 'email.clicked':
        await prisma.contact.update({
          where: { id: contactId },
          data: {
            lastEmailClickedAt: new Date(),
            totalEmailsClicked: { increment: 1 },
          },
        });
        await prisma.activity.create({
          data: {
            type: 'EmailClick',
            summary: `${displayName} clicked link in email`,
            companyId: activity.companyId,
            contactId,
            userId: activity.userId,
          },
        });
        break;

      case 'email.bounced':
        await prisma.contact.update({
          where: { id: contactId },
          data: { isDormant: true },
        });
        await prisma.activity.create({
          data: {
            type: 'EmailBounce',
            summary: `Email to ${contact.email ?? 'contact'} bounced`,
            companyId: activity.companyId,
            contactId,
            userId: activity.userId,
          },
        });
        break;

      case 'email.complained':
        await prisma.contact.update({
          where: { id: contactId },
          data: { isDormant: true },
        });
        await prisma.activity.create({
          data: {
            type: 'EmailComplaint',
            summary: `${contact.email ?? 'Contact'} marked email as spam`,
            companyId: activity.companyId,
            contactId,
            userId: activity.userId,
          },
        });
        break;

      default:
        console.log('Unhandled webhook type:', eventType);
    }

    return NextResponse.json({ received: true, type: eventType });
  } catch (e) {
    console.error('Resend webhook error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
