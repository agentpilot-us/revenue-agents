/**
 * Daily Flight Log streak: consecutive days with agent activity.
 * lastActiveAt and currentStreakDays are updated when the user has activity.
 */

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/**
 * Call when the user has agent-related activity (e.g. Activity created, approval resolved).
 * Sets lastActiveAt to today; if it was yesterday, increments currentStreakDays; otherwise sets to 1.
 */
export async function updateUserStreak(
  prisma: {
    user: {
      findUnique: (args: {
        where: { id: string };
        select: { lastActiveAt: true; currentStreakDays: true };
      }) => Promise<{ lastActiveAt: Date | null; currentStreakDays: number } | null>;
      update: (args: {
        where: { id: string };
        data: { lastActiveAt: Date; currentStreakDays: number };
      }) => Promise<unknown>;
    };
  },
  userId: string
): Promise<void> {
  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterday = addDays(now, -1);
  const yesterdayKey = toDateKey(yesterday);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true, currentStreakDays: true },
  });

  const lastKey = user?.lastActiveAt ? toDateKey(user.lastActiveAt) : null;
  let newStreak: number;

  if (lastKey === todayKey) {
    // Already active today; no change to streak
    return;
  }
  if (lastKey === yesterdayKey) {
    newStreak = (user?.currentStreakDays ?? 0) + 1;
  } else {
    newStreak = 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastActiveAt: now,
      currentStreakDays: newStreak,
    },
  });
}
