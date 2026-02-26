/**
 * Outreach limits: per-account daily cap and per-contact daily cap
 * to avoid IP spam risk and over-messaging the same contact the same day.
 */

import { prisma } from '@/lib/db';

const MAX_EMAILS_PER_ACCOUNT_PER_DAY = 20;
const MAX_EMAILS_PER_CONTACT_PER_DAY = 1;

const EMAIL_ACTIVITY_TYPES = ['Email', 'EMAIL_SENT'] as const;

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getAccountEmailsSentToday(companyId: string): Promise<number> {
  const start = startOfTodayUTC();
  return prisma.activity.count({
    where: {
      companyId,
      type: { in: [...EMAIL_ACTIVITY_TYPES] },
      createdAt: { gte: start },
    },
  });
}

export async function getContactEmailsSentToday(contactId: string): Promise<number> {
  const start = startOfTodayUTC();
  return prisma.activity.count({
    where: {
      contactId,
      type: { in: [...EMAIL_ACTIVITY_TYPES] },
      createdAt: { gte: start },
    },
  });
}

export type CheckCanSendResult = { ok: true } | { ok: false; reason: string };

/**
 * Check whether we can send an email to this contact (or to this account without a specific contact).
 * Enforces: account daily cap (20) and contact daily cap (1).
 */
export async function checkCanSendToContact(
  companyId: string,
  contactId: string | null
): Promise<CheckCanSendResult> {
  const accountCount = await getAccountEmailsSentToday(companyId);
  if (accountCount >= MAX_EMAILS_PER_ACCOUNT_PER_DAY) {
    return {
      ok: false,
      reason: `This account has reached the maximum emails per day (${MAX_EMAILS_PER_ACCOUNT_PER_DAY}). Try again tomorrow.`,
    };
  }

  if (contactId) {
    const contactCount = await getContactEmailsSentToday(contactId);
    if (contactCount >= MAX_EMAILS_PER_CONTACT_PER_DAY) {
      return {
        ok: false,
        reason:
          'This contact was already emailed today. To avoid over-messaging, send tomorrow.',
      };
    }
  }

  return { ok: true };
}
