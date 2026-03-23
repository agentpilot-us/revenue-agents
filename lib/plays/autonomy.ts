import { AutonomyLevel } from '@prisma/client';

/** Accept legacy JSON keys (notify, draft_review, auto_execute) and Prisma enum names. */
const TO_PRISMA: Record<string, AutonomyLevel> = {
  notify: AutonomyLevel.NOTIFY_ONLY,
  notify_only: AutonomyLevel.NOTIFY_ONLY,
  NOTIFY_ONLY: AutonomyLevel.NOTIFY_ONLY,
  draft_review: AutonomyLevel.DRAFT_REVIEW,
  DRAFT_REVIEW: AutonomyLevel.DRAFT_REVIEW,
  auto_execute: AutonomyLevel.AUTO_EXECUTE,
  AUTO_EXECUTE: AutonomyLevel.AUTO_EXECUTE,
};

export function parseAutonomyLevel(raw: unknown): AutonomyLevel | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  if (raw in TO_PRISMA) return TO_PRISMA[raw];
  const lower = raw.toLowerCase();
  if (lower in TO_PRISMA) return TO_PRISMA[lower];
  return null;
}

/** Stable API / JSON keys for activation customConfig (backwards compatible). */
export function autonomyLevelToLegacyKey(level: AutonomyLevel): 'notify' | 'draft_review' | 'auto_execute' {
  switch (level) {
    case AutonomyLevel.NOTIFY_ONLY:
      return 'notify';
    case AutonomyLevel.AUTO_EXECUTE:
      return 'auto_execute';
    default:
      return 'draft_review';
  }
}

export const AUTONOMY_LEVEL_VALUES = [
  AutonomyLevel.NOTIFY_ONLY,
  AutonomyLevel.DRAFT_REVIEW,
  AutonomyLevel.AUTO_EXECUTE,
] as const;
