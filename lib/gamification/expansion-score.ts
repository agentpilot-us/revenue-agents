/**
 * Expansion score and level for Flight Deck gamification.
 * Score is incremented on key events; level is derived from score.
 */

import type { PrismaClient } from '@prisma/client';

const POINTS: Record<string, number> = {
  account_created: 10,
  research_completed: 15,
  contacts_discovered: 20,
  email_sent: 25,
  meeting_booked: 40,
  opportunity_created: 30,
  play_won: 100,
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000]; // index+1 = level (1-5)
const LEVEL_LABELS: Record<number, string> = {
  1: 'Cadet',
  2: 'First Officer',
  3: 'Captain',
  4: 'Senior Captain',
  5: 'Ace',
};

function scoreToLevel(score: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(5, level);
}

export function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? 'Cadet';
}

/**
 * Increment user's expansion score and update level.
 * Call after activity creation, play WON, etc.
 * Also runs badge rules and awards newly earned badges.
 */
export async function addExpansionScore(
  prisma: PrismaClient,
  userId: string,
  eventType: keyof typeof POINTS
): Promise<void> {
  const points = POINTS[eventType];
  if (points == null) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expansionScore: true },
  });
  const currentScore = user?.expansionScore ?? 0;
  const newScore = currentScore + points;
  const newLevel = scoreToLevel(newScore);

  await prisma.user.update({
    where: { id: userId },
    data: { expansionScore: newScore, level: newLevel },
  });

  const { checkAndAwardBadges } = await import('./badges');
  void checkAndAwardBadges(prisma, userId).catch(() => {});
}
