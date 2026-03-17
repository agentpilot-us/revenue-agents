/**
 * Cooldown check: query ContactTouch for contact/company, set PlayAction.cooldownWarning
 * and alternateContact when over governance or template limits.
 */

import { subDays, startOfDay } from 'date-fns';
import { prisma } from '@/lib/db';

export type CooldownLimits = {
  cooldownDays: number;
  maxPerContactPerWeek: number;
  maxPerAccountPerWeek: number;
};

/** Resolve limits from PlayTemplate then fallback to PlayGovernance. */
export async function getCooldownLimits(
  playTemplateId: string,
  userId: string,
): Promise<CooldownLimits> {
  const [template, governance] = await Promise.all([
    prisma.playTemplate.findFirst({
      where: { id: playTemplateId, userId },
      select: { contactCooldownDays: true, maxTouchesPerWeek: true },
    }),
    prisma.playGovernance.findUnique({
      where: { userId },
      select: {
        defaultCooldownDays: true,
        maxWeeklyTouchesPerContact: true,
        maxWeeklyTouchesPerAccount: true,
      },
    }),
  ]);

  return {
    cooldownDays:
      template?.contactCooldownDays ?? governance?.defaultCooldownDays ?? 7,
    maxPerContactPerWeek:
      template?.maxTouchesPerWeek ?? governance?.maxWeeklyTouchesPerContact ?? 2,
    maxPerAccountPerWeek: governance?.maxWeeklyTouchesPerAccount ?? 5,
  };
}

/** Count ContactTouches in the last 7 days for this contact (by email or name) and for the account. */
export async function getTouchCounts(
  companyId: string,
  since: Date,
  contactEmail?: string | null,
  contactName?: string | null,
): Promise<{ contactTouches: number; accountTouches: number }> {
  const accountTouches = await prisma.contactTouch.count({
    where: {
      companyId,
      touchDate: { gte: since },
    },
  });

  if (!contactEmail && !contactName) {
    return { contactTouches: 0, accountTouches };
  }

  let contactTouches = 0;
  if (contactEmail?.trim()) {
    contactTouches = await prisma.contactTouch.count({
      where: {
        companyId,
        touchDate: { gte: since },
        contactEmail: contactEmail.trim().toLowerCase(),
      },
    });
  } else if (contactName?.trim()) {
    contactTouches = await prisma.contactTouch.count({
      where: {
        companyId,
        touchDate: { gte: since },
        contactName: contactName.trim(),
      },
    });
  }

  return { contactTouches, accountTouches };
}

/** Build cooldown warning message when over limits. */
export function buildCooldownWarning(
  limits: CooldownLimits,
  contactTouches: number,
  accountTouches: number,
): string | null {
  const parts: string[] = [];
  if (contactTouches >= limits.maxPerContactPerWeek) {
    parts.push(
      `Contact touched ${contactTouches} time(s) this week (max ${limits.maxPerContactPerWeek}). Consider waiting ${limits.cooldownDays} days or choosing another contact.`,
    );
  }
  if (accountTouches >= limits.maxPerAccountPerWeek) {
    parts.push(
      `Account has ${accountTouches} touch(es) this week (max ${limits.maxPerAccountPerWeek}).`,
    );
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

/** Find an alternate contact at the company with fewest touches in the last 7 days (exclude current). */
export async function findAlternateContact(
  companyId: string,
  _userId: string,
  excludeEmail?: string | null,
  excludeName?: string | null,
): Promise<string | null> {
  const since = startOfDay(subDays(new Date(), 7));
  const contacts = await prisma.contact.findMany({
    where: { companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    take: 25,
  });

  const excludeEmailLower = excludeEmail?.trim().toLowerCase();
  const excludeNameLower = excludeName?.trim().toLowerCase();
  const candidates = contacts.filter((c) => {
    if (excludeEmailLower && c.email?.toLowerCase() === excludeEmailLower)
      return false;
    const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
    if (excludeNameLower && fullName.toLowerCase().includes(excludeNameLower))
      return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const counts = await Promise.all(
    candidates.map(async (c) => {
      const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
      const where: { companyId: string; touchDate: { gte: Date }; contactEmail?: string; contactName?: string } = {
        companyId,
        touchDate: { gte: since },
      };
      if (c.email) where.contactEmail = c.email.toLowerCase();
      else if (fullName) where.contactName = fullName;
      const n = await prisma.contactTouch.count({ where });
      return { contact: c, count: n };
    }),
  );

  counts.sort((a, b) => a.count - b.count);
  const best = counts[0];
  if (!best) return null;
  const name = [best.contact.firstName, best.contact.lastName].filter(Boolean).join(' ') || 'Unknown';
  return best.contact.email ? `${name} (${best.contact.email})` : name;
}

/**
 * Apply cooldown check to all relevant actions in a run: for each PENDING/REVIEWED/EDITED
 * action with contact info, query touches, compute warning and optional alternate, update DB.
 */
export async function applyCooldownToPlayRun(playRunId: string, userId: string): Promise<void> {
  const run = await prisma.playRun.findFirst({
    where: { id: playRunId, userId },
    include: {
      playTemplate: { select: { id: true } },
      phaseRuns: {
        include: {
          actions: {
            where: {
              status: { in: ['PENDING', 'REVIEWED', 'EDITED'] },
              OR: [
                { contactEmail: { not: null } },
                { contactName: { not: null } },
              ],
            },
          },
        },
      },
    },
  });

  if (!run) return;

  const limits = await getCooldownLimits(run.playTemplate.id, userId);
  const weekStart = startOfDay(subDays(new Date(), 7));

  const companyId = run.companyId;
  for (const phaseRun of run.phaseRuns) {
    for (const action of phaseRun.actions) {
      const { contactTouches, accountTouches } = await getTouchCounts(
        companyId,
        weekStart,
        action.contactEmail,
        action.contactName,
      );

      const warning = buildCooldownWarning(limits, contactTouches, accountTouches);
      let alternate: string | null = null;
      if (warning) {
        alternate = await findAlternateContact(
          companyId,
          userId,
          action.contactEmail,
          action.contactName,
        );
      }

      await prisma.playAction.update({
        where: { id: action.id },
        data: {
          cooldownWarning: warning ?? null,
          alternateContact: alternate ?? null,
        },
      });
    }
  }
}
