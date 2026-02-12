/**
 * Play Library: catalog of play categories and play cards for the Play Library UI.
 * Does not include chat/agent config (see lib/plays).
 */

export type PlayCategoryId = 'expansion' | 'cross-sell' | 'renewal' | 'event';

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
        id: 'new-stakeholder-engagement',
        name: 'New Stakeholder Engagement',
        tagline: 'Welcome + Map',
        description: 'New VP/Director/C-level joins a tracked account. Research, intro email, LinkedIn, internal intro, follow-up.',
        href: '/dashboard/plays/new-stakeholder-engagement',
        hasExecutionFlow: true,
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
    id: 'cross-sell',
    name: 'Cross-Sell Plays',
    description: 'Drive adoption of new products/departments',
    plays: [
      {
        id: 'use-case-exploration',
        name: 'Use Case Exploration',
        tagline: 'Find contacts, send emails, invite to events',
        description: 'Focus on a department with messaging and product info, find contacts, send AI-drafted emails, invite to dinners and events. Start from a department page.',
        href: '/dashboard/companies',
        hasExecutionFlow: true,
      },
      {
        id: 'customer-qualified-lead',
        name: 'Customer Qualified Lead',
        tagline: 'CSM → AE Handoff',
        description: 'Hand off qualified leads from CSM to AE.',
        href: '/dashboard/plays/cross-sell/cql',
        hasExecutionFlow: false,
      },
      {
        id: 'product-led-education',
        name: 'Product-Led Education',
        tagline: 'New Dept Target',
        description: 'Educate and target new departments with product-led motion.',
        href: '/dashboard/plays/cross-sell/ple',
        hasExecutionFlow: false,
      },
    ],
  },
  {
    id: 'renewal',
    name: 'Renewal Plays',
    description: 'Secure and protect existing revenue',
    plays: [
      {
        id: 'proactive-renewal-audit',
        name: 'Proactive Renewal Audit',
        tagline: '90-day trigger',
        description: 'Proactive renewal audit triggered 90 days before renewal.',
        href: '/dashboard/plays/renewal/audit',
        hasExecutionFlow: true,
      },
      {
        id: 'executive-alignment',
        name: 'Executive Alignment',
        tagline: 'C-suite to C',
        description: 'Executive alignment and C-suite engagement.',
        href: '/dashboard/plays/renewal/executive-alignment',
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
