/**
 * Badge definitions and unlock logic for Flight Deck gamification.
 * Badges are stored on User.badges as [{ id: string, earnedAt: string }].
 */

import type { PrismaClient } from '@prisma/client';

export type BadgeEntry = { id: string; earnedAt: string };

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  rule: (prisma: PrismaClient, userId: string, period?: { start: Date; end: Date }) => Promise<boolean>;
};

function thisQuarter(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  return { start, end };
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: 'ace-expansion',
    name: 'Ace Expansion',
    description: '3 accounts with a WON expansion play in one quarter',
    rule: async (prisma, userId, period) => {
      const { start, end } = period ?? thisQuarter();
      const won = await prisma.expansionPlay.findMany({
        where: {
          status: 'WON',
          company: { userId },
          updatedAt: { gte: start, lt: end },
        },
        select: { companyId: true },
        distinct: ['companyId'],
      });
      return won.length >= 3;
    },
  },
  {
    id: 'multi-engine',
    name: 'Multi-Engine',
    description: '5+ active accounts (with contacts or outreach)',
    rule: async (prisma, userId) => {
      const companies = await prisma.company.findMany({
        where: { userId },
        select: {
          id: true,
          _count: { select: { contacts: true, activities: true } },
        },
      });
      const active = companies.filter(
        (c) => (c._count.contacts ?? 0) > 0 || (c._count.activities ?? 0) > 0
      );
      return active.length >= 5;
    },
  },
  {
    id: 'event-master',
    name: 'Event Master',
    description: '10+ contacts attending events',
    rule: async (prisma, userId) => {
      const contacts = await prisma.eventAttendance.findMany({
        where: { contact: { company: { userId } } },
        select: { contactId: true },
        distinct: ['contactId'],
      });
      return contacts.length >= 10;
    },
  },
  {
    id: 'segment-specialist',
    name: 'Segment Specialist',
    description: '40%+ response rate in a microsegment (department)',
    rule: async (prisma, userId) => {
      const depts = await prisma.contact.groupBy({
        by: ['companyDepartmentId'],
        where: {
          company: { userId },
          companyDepartmentId: { not: null },
        },
        _sum: { totalEmailsSent: true, totalEmailsReplied: true },
      });
      for (const d of depts) {
        const sent = d._sum.totalEmailsSent ?? 0;
        const replied = d._sum.totalEmailsReplied ?? 0;
        if (sent >= 5 && replied / sent >= 0.4) return true;
      }
      return false;
    },
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'First outreach within 24h of account creation',
    rule: async (prisma, userId) => {
      const companies = await prisma.company.findMany({
        where: { userId },
        select: { id: true, createdAt: true },
      });
      for (const co of companies) {
        const firstOutreach = await prisma.activity.findFirst({
          where: {
            companyId: co.id,
            type: { in: ['Email', 'Meeting'] },
          },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        if (firstOutreach) {
          const ms = firstOutreach.createdAt.getTime() - co.createdAt.getTime();
          if (ms >= 0 && ms <= 24 * 60 * 60 * 1000) return true;
        }
      }
      return false;
    },
  },
  {
    id: 'winter-ace-2026',
    name: 'Winter Ace 2026',
    description: 'Completed Winter Flight Challenge (event attendees + meetings)',
    rule: async () => false, // Awarded via seasonal challenge completion only
  },
];

export function getEarnedBadgeIds(badges: BadgeEntry[] | null): Set<string> {
  if (!Array.isArray(badges)) return new Set();
  return new Set(badges.map((b) => b.id));
}

/**
 * Run all badge rules; append newly earned badges to User.badges.
 * Call after addExpansionScore or periodically (e.g. daily).
 */
export async function checkAndAwardBadges(
  prisma: PrismaClient,
  userId: string
): Promise<BadgeEntry[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });
  const existing = getEarnedBadgeIds((user?.badges as BadgeEntry[] | null) ?? null);
  const period = thisQuarter();
  const newlyEarned: BadgeEntry[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (existing.has(badge.id)) continue;
    try {
      const earned = await badge.rule(prisma, userId, period);
      if (earned) {
        newlyEarned.push({ id: badge.id, earnedAt: new Date().toISOString() });
        existing.add(badge.id);
      }
    } catch {
      // Skip failed rule
    }
  }

  if (newlyEarned.length > 0) {
    const current = (user?.badges as BadgeEntry[] | null) ?? [];
    const updated = [...current, ...newlyEarned];
    await prisma.user.update({
      where: { id: userId },
      data: { badges: updated as object },
    });
  }

  return newlyEarned;
}

export function getBadgeById(id: string): BadgeDef | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
