import { prisma } from '@/lib/db';

export type EngagementInput = {
  contactId: string;
  emailOpens?: number;
  emailClicks?: number;
  emailReplies?: number;
  lastContactedAt?: Date | null;
};

/** Contact fields required for engagement score calculation */
export type ContactForScore = {
  totalEmailsSent?: number | null;
  totalEmailsOpened?: number | null;
  totalEmailsClicked?: number | null;
  totalEmailsReplied?: number | null;
  lastEmailRepliedAt?: Date | null;
};

/**
 * Compute engagement score from contact (sync, no DB).
 * - Email activity (max 40): opens×2 + clicks×5 + replies×10
 * - Recency (max 30): last reply < 7d → 30, < 30d → 20, < 90d → 10
 * - Response rate (max 30): (replies/sent)×100, capped at 30
 * Total capped at 100.
 */
export function calculateEngagementScore(contact: ContactForScore): number {
  let score = 0;

  const opens = contact.totalEmailsOpened ?? 0;
  const clicks = contact.totalEmailsClicked ?? 0;
  const replies = contact.totalEmailsReplied ?? 0;
  const sent = contact.totalEmailsSent ?? 0;

  const emailActivityScore = Math.min(
    40,
    opens * 2 + clicks * 5 + replies * 10
  );
  score += emailActivityScore;

  if (contact.lastEmailRepliedAt) {
    const daysSinceReply = Math.floor(
      (Date.now() - new Date(contact.lastEmailRepliedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceReply < 7) score += 30;
    else if (daysSinceReply < 30) score += 20;
    else if (daysSinceReply < 90) score += 10;
  }

  if (sent > 0) {
    const responseRate = (replies / sent) * 100;
    score += Math.min(30, responseRate);
  }

  return Math.min(100, Math.round(score));
}

/**
 * Helper to determine seniority level from job title.
 */
export function determineSeniorityLevel(title: string | null): {
  seniority: string;
  seniorityLevel: number;
} {
  if (!title) {
    return { seniority: 'Unknown', seniorityLevel: 0 };
  }

  const titleLower = title.toLowerCase();

  if (
    titleLower.includes('ceo') ||
    titleLower.includes('cto') ||
    titleLower.includes('cfo') ||
    titleLower.includes('coo') ||
    titleLower.includes('chief')
  ) {
    return { seniority: 'C-Level', seniorityLevel: 6 };
  }
  if (titleLower.includes('svp') || titleLower.includes('senior vice president')) {
    return { seniority: 'SVP', seniorityLevel: 5 };
  }
  if (titleLower.includes('vp') || titleLower.includes('vice president')) {
    return { seniority: 'VP', seniorityLevel: 4 };
  }
  if (titleLower.includes('director')) {
    return { seniority: 'Director', seniorityLevel: 3 };
  }
  if (titleLower.includes('manager') || titleLower.includes('lead')) {
    return { seniority: 'Manager', seniorityLevel: 2 };
  }
  return { seniority: 'IC', seniorityLevel: 1 };
}

export async function calculateContactEngagement(
  contactId: string
): Promise<{ score: number; factors: Record<string, number> }> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    return { score: 0, factors: {} };
  }

  const score = calculateEngagementScore(contact);
  const factors: Record<string, number> = {
    opens: contact.totalEmailsOpened ?? 0,
    clicks: contact.totalEmailsClicked ?? 0,
    replies: contact.totalEmailsReplied ?? 0,
    sent: contact.totalEmailsSent ?? 0,
  };
  return { score, factors };
}

/**
 * Batch update engagement for all contacts (or for a given company).
 * Call from cron.
 */
export async function calculateEngagementForAccount(companyId?: string): Promise<number> {
  const where = companyId ? { companyId } : {};
  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      totalEmailsSent: true,
      totalEmailsOpened: true,
      totalEmailsClicked: true,
      totalEmailsReplied: true,
      lastEmailRepliedAt: true,
      lastContactedAt: true,
    },
  });
  let updated = 0;
  for (const c of contacts) {
    const score = calculateEngagementScore(c);
    await prisma.contact.update({
      where: { id: c.id },
      data: { engagementScore: score },
    });
    updated++;
  }
  return updated;
}
