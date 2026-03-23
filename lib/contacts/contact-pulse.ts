/**
 * Contact Pulse — lightweight, read-only activity intelligence derived
 * from Activity, ContactTouch, PlayAction, and EventAttendance.
 *
 * Pending steps and engagement use PlayAction/ContactTouch (new play system).
 */

import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContactPulse = {
  contactId: string;
  contactName: string;
  title: string | null;
  email: string | null;
  companyName: string;
  companyId: string;

  lastTouchDate: string | null;
  daysSinceLastTouch: number | null;

  totalEmails: number;
  emailsThisWeek: number;
  lastEmailOpenedAt: string | null;
  lastEmailClickedAt: string | null;
  hasReplied: boolean;
  lastReplyDate: string | null;

  pendingFollowUps: number;

  eventsInvited: Array<{ eventName: string; rsvpStatus: string | null }>;

  recentActivity: Array<{
    type: string;
    summary: string;
    date: string;
    channel: string | null;
    opened: boolean;
    clicked: boolean;
  }>;

  flags: ContactFlag[];
};

export type ContactFlag =
  | 'over_emailed'
  | 'awaiting_reply'
  | 'follow_up_due'
  | 'gone_cold'
  | 'hot_lead';

export type NeedsAttentionContact = {
  contactId: string;
  contactName: string;
  title: string | null;
  email: string | null;
  companyId: string;
  companyName: string;
  flags: ContactFlag[];
  lastTouchDate: string | null;
  daysSinceLastTouch: number | null;
  pendingSteps: number;
};

export type PlayActivitySummaryData = {
  playsStarted: number;
  playsInProgress: number;
  playsCompleted: number;
  totalSteps: number;
  completedSteps: number;
  completionRate: number;
  byChannel: Array<{ channel: string; count: number }>;
};

export type ContactEngagementRow = {
  contactId: string;
  contactName: string;
  title: string | null;
  companyId: string;
  companyName: string;
  lastTouchDate: string | null;
  daysSinceLastTouch: number | null;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  isResponsive: boolean;
  isDormant: boolean;
  flags: ContactFlag[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
}

function startOfWeek(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function contactName(c: { firstName: string | null; lastName: string | null }): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
}

function computeFlags(opts: {
  emailsLast7Days: number;
  hasRecentOpen: boolean;
  hasRecentReply: boolean;
  lastTouchDate: Date | null;
  hasPendingStepsOlderThan3Days: boolean;
  lastEmailOpenedAt: Date | null;
  lastEmailRepliedAt: Date | null;
}): ContactFlag[] {
  const flags: ContactFlag[] = [];

  if (opts.emailsLast7Days >= 3 && !opts.hasRecentOpen && !opts.hasRecentReply) {
    flags.push('over_emailed');
  }

  if (
    opts.lastEmailOpenedAt &&
    !opts.hasRecentReply &&
    daysSince(opts.lastEmailOpenedAt)! >= 3
  ) {
    flags.push('awaiting_reply');
  }

  if (opts.hasPendingStepsOlderThan3Days) {
    flags.push('follow_up_due');
  }

  if (opts.lastTouchDate && daysSince(opts.lastTouchDate)! >= 14) {
    flags.push('gone_cold');
  }

  if (
    (opts.hasRecentReply || (opts.lastEmailOpenedAt && daysSince(opts.lastEmailOpenedAt)! <= 2)) &&
    !flags.includes('over_emailed')
  ) {
    flags.push('hot_lead');
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Core queries
// ---------------------------------------------------------------------------

export async function getContactPulse(
  contactId: string,
  userId: string,
): Promise<ContactPulse | null> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, company: { userId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      companyId: true,
      lastContactedAt: true,
      lastEmailOpenedAt: true,
      lastEmailClickedAt: true,
      lastEmailRepliedAt: true,
      totalEmailsSent: true,
      totalEmailsOpened: true,
      totalEmailsClicked: true,
      totalEmailsReplied: true,
      isResponsive: true,
      company: { select: { name: true } },
    },
  });
  if (!contact) return null;

  const weekStart = startOfWeek();
  const sevenDaysAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const threeDaysAgo = new Date(Date.now() - 3 * MS_PER_DAY);

  const [emailsThisWeek, emailsLast7Days, recentActivities, pendingSteps, events] =
    await Promise.all([
      prisma.activity.count({
        where: {
          contactId,
          type: { in: ['EMAIL_SENT', 'Email'] },
          createdAt: { gte: weekStart },
        },
      }),
      prisma.activity.count({
        where: {
          contactId,
          type: { in: ['EMAIL_SENT', 'Email'] },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.activity.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          type: true,
          summary: true,
          createdAt: true,
          emailOpenedAt: true,
          emailClickedAt: true,
        },
      }),
      // Pending PlayActions for this contact (by email) in ACTIVE runs, created 3+ days ago
      (async () => {
        if (!contact.email) return 0;
        const count = await prisma.playAction.count({
          where: {
            status: 'PENDING',
            contactEmail: contact.email,
            phaseRun: {
              playRun: { status: 'ACTIVE' },
            },
            createdAt: { lte: threeDaysAgo },
          },
        });
        return count;
      })(),
      prisma.eventAttendance.findMany({
        where: { contactId },
        select: { eventName: true, rsvpStatus: true },
        orderBy: { eventDate: 'desc' },
      }),
    ]);

  const hasRecentReply = contact.lastEmailRepliedAt
    ? daysSince(contact.lastEmailRepliedAt)! <= 7
    : false;

  const flags = computeFlags({
    emailsLast7Days,
    hasRecentOpen: contact.lastEmailOpenedAt
      ? daysSince(contact.lastEmailOpenedAt)! <= 2
      : false,
    hasRecentReply,
    lastTouchDate: contact.lastContactedAt,
    hasPendingStepsOlderThan3Days: pendingSteps > 0,
    lastEmailOpenedAt: contact.lastEmailOpenedAt,
    lastEmailRepliedAt: contact.lastEmailRepliedAt,
  });

  return {
    contactId: contact.id,
    contactName: contactName(contact),
    title: contact.title,
    email: contact.email,
    companyName: contact.company.name,
    companyId: contact.companyId,

    lastTouchDate: contact.lastContactedAt?.toISOString() ?? null,
    daysSinceLastTouch: daysSince(contact.lastContactedAt),

    totalEmails: contact.totalEmailsSent,
    emailsThisWeek,
    lastEmailOpenedAt: contact.lastEmailOpenedAt?.toISOString() ?? null,
    lastEmailClickedAt: contact.lastEmailClickedAt?.toISOString() ?? null,
    hasReplied: contact.totalEmailsReplied > 0,
    lastReplyDate: contact.lastEmailRepliedAt?.toISOString() ?? null,

    pendingFollowUps: pendingSteps,

    eventsInvited: events.map((e) => ({
      eventName: e.eventName,
      rsvpStatus: e.rsvpStatus,
    })),

    recentActivity: recentActivities.map((a) => ({
      type: a.type,
      summary: a.summary,
      date: a.createdAt.toISOString(),
      channel: null,
      opened: !!a.emailOpenedAt,
      clicked: !!a.emailClickedAt,
    })),

    flags,
  };
}

/**
 * Find contacts at a company who are missing a specific action.
 * Supports: event invites, emails, meetings.
 */
export async function findContactsMissingAction(opts: {
  companyId: string;
  userId: string;
  actionType: 'event_invite' | 'email' | 'meeting' | 'any_touch';
  eventName?: string;
  sinceDays?: number;
  departmentId?: string;
  minSeniorityLevel?: number;
}): Promise<Array<{
  contactId: string;
  contactName: string;
  title: string | null;
  email: string | null;
  seniority: string | null;
  departmentName: string | null;
}>> {
  const since = opts.sinceDays
    ? new Date(Date.now() - opts.sinceDays * MS_PER_DAY)
    : null;

  const contactWhere: Record<string, unknown> = {
    companyId: opts.companyId,
    company: { userId: opts.userId },
  };
  if (opts.departmentId) contactWhere.companyDepartmentId = opts.departmentId;
  if (opts.minSeniorityLevel) contactWhere.seniorityLevel = { gte: opts.minSeniorityLevel };

  const allContacts = await prisma.contact.findMany({
    where: contactWhere as any,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      seniority: true,
      companyDepartment: { select: { customName: true, type: true } },
    },
  });

  if (allContacts.length === 0) return [];

  const contactIds = allContacts.map((c) => c.id);

  let contactsWithAction: Set<string>;

  if (opts.actionType === 'event_invite') {
    const eventWhere: Record<string, unknown> = {
      contactId: { in: contactIds },
    };
    if (opts.eventName) eventWhere.eventName = { contains: opts.eventName, mode: 'insensitive' };
    if (since) eventWhere.createdAt = { gte: since };

    const attendances = await prisma.eventAttendance.findMany({
      where: eventWhere as any,
      select: { contactId: true },
    });
    contactsWithAction = new Set(attendances.map((a) => a.contactId));
  } else if (opts.actionType === 'email') {
    const activities = await prisma.activity.findMany({
      where: {
        contactId: { in: contactIds },
        type: { in: ['EMAIL_SENT', 'Email'] },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { contactId: true },
    });
    contactsWithAction = new Set(
      activities.map((a) => a.contactId).filter(Boolean) as string[],
    );
  } else if (opts.actionType === 'meeting') {
    const activities = await prisma.activity.findMany({
      where: {
        contactId: { in: contactIds },
        type: { in: ['MEETING_SCHEDULED', 'Meeting'] },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { contactId: true },
    });
    contactsWithAction = new Set(
      activities.map((a) => a.contactId).filter(Boolean) as string[],
    );
  } else {
    const activities = await prisma.activity.findMany({
      where: {
        contactId: { in: contactIds },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { contactId: true },
    });
    contactsWithAction = new Set(
      activities.map((a) => a.contactId).filter(Boolean) as string[],
    );
  }

  return allContacts
    .filter((c) => !contactsWithAction.has(c.id))
    .map((c) => ({
      contactId: c.id,
      contactName: contactName(c),
      title: c.title,
      email: c.email,
      seniority: c.seniority,
      departmentName:
        c.companyDepartment?.customName ??
        c.companyDepartment?.type?.replace(/_/g, ' ') ??
        null,
    }));
}

/**
 * Contacts who responded (opened, clicked, replied) — the inverse query.
 */
export async function findContactsWithResponse(opts: {
  companyId: string;
  userId: string;
  responseType: 'opened' | 'clicked' | 'replied';
  sinceDays?: number;
}): Promise<Array<{
  contactId: string;
  contactName: string;
  title: string | null;
  email: string | null;
  responseDate: string;
}>> {
  const since = opts.sinceDays
    ? new Date(Date.now() - opts.sinceDays * MS_PER_DAY)
    : new Date(Date.now() - 30 * MS_PER_DAY);

  const contacts = await prisma.contact.findMany({
    where: {
      companyId: opts.companyId,
      company: { userId: opts.userId },
      ...(opts.responseType === 'replied'
        ? { lastEmailRepliedAt: { gte: since } }
        : opts.responseType === 'clicked'
          ? { lastEmailClickedAt: { gte: since } }
          : { lastEmailOpenedAt: { gte: since } }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      lastEmailOpenedAt: true,
      lastEmailClickedAt: true,
      lastEmailRepliedAt: true,
    },
    orderBy:
      opts.responseType === 'replied'
        ? { lastEmailRepliedAt: 'desc' }
        : opts.responseType === 'clicked'
          ? { lastEmailClickedAt: 'desc' }
          : { lastEmailOpenedAt: 'desc' },
  });

  return contacts.map((c) => {
    const responseDate =
      opts.responseType === 'replied'
        ? c.lastEmailRepliedAt
        : opts.responseType === 'clicked'
          ? c.lastEmailClickedAt
          : c.lastEmailOpenedAt;
    return {
      contactId: c.id,
      contactName: contactName(c),
      title: c.title,
      email: c.email,
      responseDate: responseDate?.toISOString() ?? '',
    };
  });
}

/**
 * "Needs Attention" — contacts with active flags across all accounts.
 */
export async function getNeedsAttentionContacts(
  userId: string,
  limit = 20,
): Promise<NeedsAttentionContact[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * MS_PER_DAY);
  const sevenDaysAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const fourteenDaysAgo = new Date(Date.now() - 14 * MS_PER_DAY);

  // Contacts with pending PlayActions older than 3 days (follow_up_due) in ACTIVE runs
  const pendingPlayActions = await prisma.playAction.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: threeDaysAgo },
      contactEmail: { not: null },
      phaseRun: {
        playRun: { userId, status: 'ACTIVE' },
      },
    },
    select: {
      contactEmail: true,
      phaseRun: { select: { playRun: { select: { companyId: true } } } },
    },
  });
  const emails = [...new Set(pendingPlayActions.map((a) => a.contactEmail).filter(Boolean))] as string[];
  const companyIds = [...new Set(pendingPlayActions.map((a) => a.phaseRun.playRun.companyId))];
  const contactsByEmail = await prisma.contact.findMany({
    where: {
      company: { userId },
      companyId: { in: companyIds },
      email: { in: emails },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      companyId: true,
      lastContactedAt: true,
      lastEmailOpenedAt: true,
      lastEmailRepliedAt: true,
      totalEmailsSent: true,
      isResponsive: true,
      isDormant: true,
      company: { select: { name: true } },
    },
  });
  const pendingCountByContactId: Record<string, number> = {};
  for (const a of pendingPlayActions) {
    const contact = contactsByEmail.find((c) => c.email === a.contactEmail);
    if (contact) {
      pendingCountByContactId[contact.id] = (pendingCountByContactId[contact.id] ?? 0) + 1;
    }
  }
  const pendingStepContacts = contactsByEmail
    .filter((c) => (pendingCountByContactId[c.id] ?? 0) > 0)
    .map((c) => ({
      contactId: c.id,
      contact: c,
      pendingCount: pendingCountByContactId[c.id] ?? 0,
    }));

  // Contacts who opened but didn't reply (3+ days ago) — awaiting_reply
  const awaitingReply = await prisma.contact.findMany({
    where: {
      company: { userId },
      lastEmailOpenedAt: { gte: sevenDaysAgo, lte: threeDaysAgo },
      lastEmailRepliedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      companyId: true,
      lastContactedAt: true,
      lastEmailOpenedAt: true,
      lastEmailRepliedAt: true,
      totalEmailsSent: true,
      isResponsive: true,
      isDormant: true,
      company: { select: { name: true } },
    },
    take: limit,
  });

  // Contacts gone cold (last touch 14+ days, had prior engagement)
  const goneCold = await prisma.contact.findMany({
    where: {
      company: { userId },
      lastContactedAt: { lte: fourteenDaysAgo, not: null },
      totalEmailsSent: { gte: 1 },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      email: true,
      companyId: true,
      lastContactedAt: true,
      lastEmailOpenedAt: true,
      lastEmailRepliedAt: true,
      totalEmailsSent: true,
      isResponsive: true,
      isDormant: true,
      company: { select: { name: true } },
    },
    take: limit,
    orderBy: { lastContactedAt: 'asc' },
  });

  // Dedupe and compute flags
  const seen = new Set<string>();
  const results: NeedsAttentionContact[] = [];

  const addContact = (
    c: NonNullable<typeof pendingStepContacts[0]['contact']>,
    flag: ContactFlag,
    pendingSteps: number,
  ) => {
    if (!c || seen.has(c.id)) {
      const existing = results.find((r) => r.contactId === c?.id);
      if (existing && !existing.flags.includes(flag)) existing.flags.push(flag);
      return;
    }
    seen.add(c.id);
    results.push({
      contactId: c.id,
      contactName: contactName(c),
      title: c.title,
      email: c.email,
      companyId: c.companyId,
      companyName: c.company.name,
      flags: [flag],
      lastTouchDate: c.lastContactedAt?.toISOString() ?? null,
      daysSinceLastTouch: daysSince(c.lastContactedAt),
      pendingSteps,
    });
  };

  for (const item of pendingStepContacts) {
    if (item.contact) addContact(item.contact, 'follow_up_due', item.pendingCount);
  }
  for (const c of awaitingReply) {
    addContact(c, 'awaiting_reply', 0);
  }
  for (const c of goneCold) {
    addContact(c, 'gone_cold', 0);
  }

  return results.slice(0, limit);
}

/**
 * Play activity summary for the analytics page (PlayRun + PlayAction).
 */
export async function getPlayActivitySummary(opts: {
  userId: string;
  companyId?: string;
  startDate: Date;
  endDate: Date;
}): Promise<PlayActivitySummaryData> {
  const runWhere: Record<string, unknown> = {
    userId: opts.userId,
    createdAt: { gte: opts.startDate, lte: opts.endDate },
  };
  if (opts.companyId) runWhere.companyId = opts.companyId;

  const [runs, actions] = await Promise.all([
    prisma.playRun.findMany({
      where: runWhere as any,
      select: { status: true },
    }),
    prisma.playAction.findMany({
      where: {
        phaseRun: { playRun: runWhere as any },
      },
      select: { status: true, actionType: true },
    }),
  ]);

  const playsStarted = runs.length;
  const playsInProgress = runs.filter((r) => r.status === 'ACTIVE').length;
  const playsCompleted = runs.filter((r) => r.status === 'COMPLETED').length;

  const totalSteps = actions.length;
  const completedSteps = actions.filter((s) => s.status === 'EXECUTED').length;
  const completionRate = totalSteps > 0 ? completedSteps / totalSteps : 0;

  const channelCounts: Record<string, number> = {};
  for (const a of actions) {
    if (a.status === 'EXECUTED') {
      const ch = a.actionType === 'SEND_EMAIL' ? 'email' : a.actionType === 'SEND_LINKEDIN' ? 'linkedin' : 'other';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }
  }

  return {
    playsStarted,
    playsInProgress,
    playsCompleted,
    totalSteps,
    completedSteps,
    completionRate,
    byChannel: Object.entries(channelCounts)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Contact engagement table rows for analytics.
 */
export async function getContactEngagementRows(opts: {
  userId: string;
  companyId?: string;
  startDate: Date;
  endDate: Date;
  limit?: number;
}): Promise<ContactEngagementRow[]> {
  const contactWhere: Record<string, unknown> = {
    company: { userId: opts.userId },
    totalEmailsSent: { gte: 1 },
  };
  if (opts.companyId) contactWhere.companyId = opts.companyId;

  const contacts = await prisma.contact.findMany({
    where: contactWhere as any,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      companyId: true,
      lastContactedAt: true,
      lastEmailOpenedAt: true,
      lastEmailRepliedAt: true,
      totalEmailsSent: true,
      totalEmailsOpened: true,
      totalEmailsClicked: true,
      totalEmailsReplied: true,
      isResponsive: true,
      isDormant: true,
      company: { select: { name: true } },
    },
    orderBy: { lastContactedAt: 'asc' },
    take: opts.limit ?? 50,
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const threeDaysAgo = new Date(Date.now() - 3 * MS_PER_DAY);

  return contacts.map((c) => {
    const flags = computeFlags({
      emailsLast7Days: c.totalEmailsSent,
      hasRecentOpen: c.lastEmailOpenedAt ? daysSince(c.lastEmailOpenedAt)! <= 2 : false,
      hasRecentReply: c.lastEmailRepliedAt ? daysSince(c.lastEmailRepliedAt)! <= 7 : false,
      lastTouchDate: c.lastContactedAt,
      hasPendingStepsOlderThan3Days: false,
      lastEmailOpenedAt: c.lastEmailOpenedAt,
      lastEmailRepliedAt: c.lastEmailRepliedAt,
    });

    return {
      contactId: c.id,
      contactName: contactName(c),
      title: c.title,
      companyId: c.companyId,
      companyName: c.company.name,
      lastTouchDate: c.lastContactedAt?.toISOString() ?? null,
      daysSinceLastTouch: daysSince(c.lastContactedAt),
      emailsSent: c.totalEmailsSent,
      emailsOpened: c.totalEmailsOpened,
      emailsClicked: c.totalEmailsClicked,
      emailsReplied: c.totalEmailsReplied,
      isResponsive: c.isResponsive,
      isDormant: c.isDormant,
      flags,
    };
  });
}
