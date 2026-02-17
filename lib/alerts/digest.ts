import { prisma } from '@/lib/db';
import { sendDigestEmail, type DigestAlertItem } from './channels/email';

/**
 * Send daily digest emails to users who have emailDigest === 'daily' and have
 * alerts from the last 24 hours that haven't been sent via email yet.
 */
export async function sendDailyDigests(): Promise<{ usersProcessed: number; emailsSent: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      alertSettings: true,
    },
  });

  let usersProcessed = 0;
  let emailsSent = 0;

  for (const user of users) {
    const email = user.email;
    if (!email) continue;

    const settings = (user.alertSettings as Record<string, unknown>) || {};
    if (settings.enabled === false) continue;
    if (settings.email === false) continue;
    if (settings.emailDigest !== 'daily') continue;

    const pending = await prisma.alert.findMany({
      where: {
        userId: user.id,
        sentViaEmail: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        data: true,
        createdAt: true,
      },
    });

    if (pending.length === 0) continue;

    usersProcessed++;
    const items: DigestAlertItem[] = pending.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      data: (a.data as Record<string, unknown>) || {},
      createdAt: a.createdAt,
    }));

    const ok = await sendDigestEmail({ to: email, alerts: items });
    if (ok) {
      emailsSent++;
      await prisma.alert.updateMany({
        where: { id: { in: pending.map((a) => a.id) } },
        data: { sentViaEmail: true },
      });
    }
  }

  return { usersProcessed, emailsSent };
}
