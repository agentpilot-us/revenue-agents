/**
 * Play Library: catalog of play categories and play cards for the Play Library UI.
 * Does not include chat/agent config (see lib/plays).
 */

export type PlayCategoryId = 'expansion' | 'event';

export type PlayCard = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Route for detail/start (e.g. /dashboard/plays/new-stakeholder-engagement) */
  href: string;
  /** If true, this play has a full execution flow in-app */
  hasExecutionFlow?: boolean;
};

export type PlayCategory = {
  id: PlayCategoryId;
  name: string;
  description: string;
  plays: PlayCard[];
};

export const PLAY_CATEGORIES: PlayCategory[] = [
  {
    id: 'expansion',
    name: 'Expansion Plays',
    description: 'Grow revenue within existing accounts',
    plays: [
      {
        id: 'usage-threshold-trigger',
        name: 'Usage Threshold Trigger',
        tagline: 'PLG → Upgrade',
        description: 'Trigger upgrade motion when usage hits thresholds.',
        href: '/dashboard/plays/expansion/usage-threshold',
        hasExecutionFlow: false,
      },
      {
        id: 'executive-business-review',
        name: 'Executive Business Review',
        tagline: 'Strategic QBR',
        description: 'Executive-level business review and strategic QBR.',
        href: '/dashboard/plays/expansion/executive-qbr',
        hasExecutionFlow: false,
      },
    ],
  },
  {
    id: 'event',
    name: 'Event Plays',
    description: 'High-touch relationship building',
    plays: [
      {
        id: 'vip-roundtable',
        name: 'VIP Roundtable Dinner',
        tagline: '5-10 executives',
        description: 'VIP roundtable dinner with 5-10 executives.',
        href: '/dashboard/plays/event/vip-roundtable',
        hasExecutionFlow: true,
      },
      {
        id: 'conference-account-target',
        name: 'Conference Account Target',
        tagline: 'Pre/post event',
        description: 'Target accounts around conferences with pre/post event motion.',
        href: '/dashboard/plays/event/conference',
        hasExecutionFlow: false,
      },
    ],
  },
];

export function getPlayCategory(id: PlayCategoryId): PlayCategory | undefined {
  return PLAY_CATEGORIES.find((c) => c.id === id);
}

export function getPlayCard(categoryId: PlayCategoryId, playId: string): PlayCard | undefined {
  const cat = getPlayCategory(categoryId);
  return cat?.plays.find((p) => p.id === playId);
}

export function getPlayCardByHref(href: string): PlayCard | undefined {
  for (const cat of PLAY_CATEGORIES) {
    const card = cat.plays.find((p) => p.href === href || href.startsWith(p.href + '/'));
    if (card) return card;
  }
  return undefined;
}
