/**
 * Seasonal challenges: time-boxed goals (e.g. Winter Flight Challenge)
 * with progress from EventAttendance and Activity type Meeting.
 * Badge (e.g. Winter Ace 2026) is granted when all goals are met.
 */

import type { PrismaClient } from '@prisma/client';
import type { BadgeEntry } from './badges';
import { getEarnedBadgeIds } from './badges';

export type ChallengeGoal = {
  id: string;
  label: string;
  target: number;
};

export type SeasonalChallengeConfig = {
  id: string;
  name: string;
  badgeId: string;
  startsAt: Date;
  endsAt: Date;
  goals: ChallengeGoal[];
};

/** Winter Flight Challenge Q1 2026 */
const WINTER_FLIGHT_2026: SeasonalChallengeConfig = {
  id: 'winter-flight-2026',
  name: 'Winter Flight Challenge',
  badgeId: 'winter-ace-2026',
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: new Date('2026-03-31T23:59:59.999Z'),
  goals: [
    { id: 'event-attendees', label: 'Contacts attending events', target: 20 },
    { id: 'meetings', label: 'Meetings booked', target: 10 },
  ],
};

/** Current active challenge (config-only; progress computed on read). */
export function getCurrentChallenge(): SeasonalChallengeConfig | null {
  const now = new Date();
  if (now >= WINTER_FLIGHT_2026.startsAt && now <= WINTER_FLIGHT_2026.endsAt) {
    return WINTER_FLIGHT_2026;
  }
  return null;
}

export type ChallengeProgress = {
  eventAttendees: number;
  meetingsBooked: number;
  goalEventAttendees: number;
  goalMeetingsBooked: number;
  completed: boolean;
  badgeEarned: boolean;
  endsAt: Date;
  challengeName: string;
};

/**
 * Compute progress for the current user and challenge window.
 * "Contacts attending events" = distinct contacts (user's companies) with EventAttendance where eventDate in window.
 * "Meetings booked" = Activity type Meeting, userId, createdAt in window.
 */
export async function getChallengeProgressForUser(
  prisma: PrismaClient,
  userId: string
): Promise<ChallengeProgress | null> {
  const challenge = getCurrentChallenge();
  if (!challenge) return null;

  const eventGoal = challenge.goals.find((g) => g.id === 'event-attendees');
  const meetingsGoal = challenge.goals.find((g) => g.id === 'meetings');
  const goalEventAttendees = eventGoal?.target ?? 0;
  const goalMeetingsBooked = meetingsGoal?.target ?? 0;

  const [eventAttendeesCount, meetingsBookedCount] = await Promise.all([
    prisma.eventAttendance.findMany({
      where: {
        contact: { company: { userId } },
        eventDate: { gte: challenge.startsAt, lte: challenge.endsAt },
      },
      select: { contactId: true },
      distinct: ['contactId'],
    }).then((rows) => rows.length),
    prisma.activity.count({
      where: {
        userId,
        type: 'Meeting',
        createdAt: { gte: challenge.startsAt, lte: challenge.endsAt },
      },
    }),
  ]);

  const completed =
    eventAttendeesCount >= goalEventAttendees && meetingsBookedCount >= goalMeetingsBooked;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });
  const earnedIds = getEarnedBadgeIds((user?.badges as BadgeEntry[] | null) ?? null);
  const badgeEarned = earnedIds.has(challenge.badgeId);

  return {
    eventAttendees: eventAttendeesCount,
    meetingsBooked: meetingsBookedCount,
    goalEventAttendees,
    goalMeetingsBooked,
    completed,
    badgeEarned,
    endsAt: challenge.endsAt,
    challengeName: challenge.name,
  };
}

/**
 * If challenge is complete and badge not yet awarded, append badge to User.badges.
 * Call after creating EventAttendance or Meeting activity, or on dashboard load.
 */
export async function grantSeasonalBadgeIfEarned(
  prisma: PrismaClient,
  userId: string
): Promise<boolean> {
  const progress = await getChallengeProgressForUser(prisma, userId);
  if (!progress || !progress.completed || progress.badgeEarned) return false;

  const challenge = getCurrentChallenge();
  if (!challenge) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });
  const current = (user?.badges as BadgeEntry[] | null) ?? [];
  const updated = [...current, { id: challenge.badgeId, earnedAt: new Date().toISOString() }];
  await prisma.user.update({
    where: { id: userId },
    data: { badges: updated as object },
  });
  return true;
}
