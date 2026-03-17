import { expansion } from './expansion';
import { partner } from './partner';
import { referral } from './referral';

export type PlayContext = {
  companyName?: string;
  companyDomain?: string;
  stage?: string;
  tier?: string;
  messagingSection: string;
  /** Optional Cal.com (or similar) public booking URL for "let them pick a time" */
  calendarBookingUrl?: string;
};

export type PlayConfig = {
  id: string;
  name: string;
  description: string;
  toolIds: string[];
  buildSystemPrompt: (ctx: PlayContext) => string;
};

const plays: Record<string, PlayConfig> = {
  expansion,
  partner,
  referral,
};

export function getPlay(playId: string): PlayConfig | null {
  return plays[playId] ?? null;
}

export function getAllPlays(): PlayConfig[] {
  return [expansion, partner, referral];
}

export { expansion, partner, referral };
