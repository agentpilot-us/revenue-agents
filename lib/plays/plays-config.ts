/**
 * Tactical plays: single source of truth for the 5 plays (new buying group,
 * event invite, feature release, re-engagement, champion enablement).
 * Used by the play engine and execute-play.
 */

export type PlayId =
  | 'new_buying_group'
  | 'event_invite'
  | 'feature_release'
  | 're_engagement'
  | 'champion_enablement';

export type PlayTriggerCondition = {
  hasUnenrichedBuyingGroups?: boolean;
  hasUpcomingEvents?: boolean;
  hasRecentFeatureRelease?: boolean;
  daysSinceLastActivity?: number;
  hasChampionNoEconomicBuyer?: boolean;
};

export type PlayPageType =
  | 'sales_page'
  | 'feature_announcement'
  | 'event_invite'
  | 'account_intro'
  | 'case_study'
  | 're_engagement'
  | 'champion_enablement';

export type PlayContext = {
  accountName: string;
  accountDomain: string;
  accountIndustry: string | null;
  segment: {
    id: string;
    name: string;
    valueProp: string | null;
    contactCount: number;
    lastActivityDays: number | null;
  };
  events?: { name: string; date: string; description: string }[];
  featureRelease?: { title: string; date: string; description: string };
  caseStudy?: { title: string; outcome: string };
  championName?: string;
  /** When a play is triggered by an external signal, carry it here */
  triggerSignal?: {
    type: string;
    title: string;
    summary: string;
    publishedAt: string;
  };
};

export type Play = {
  id: PlayId;
  name: string;
  description: string;
  triggerLabel: string;
  icon: string;
  pageType: PlayPageType;
  condition: PlayTriggerCondition;
  buildPrompt: (ctx: PlayContext) => string;
};

export const PLAYS: Play[] = [
  {
    id: 'new_buying_group',
    name: 'Open New Buying Group',
    description: 'Build a sales page and intro email for a buying group with no outreach yet.',
    triggerLabel: 'buying groups with no sales page',
    icon: '🎯',
    pageType: 'sales_page',
    condition: { hasUnenrichedBuyingGroups: true },
    buildPrompt: (ctx) =>
      `
Create a sales page and intro email for the ${ctx.segment.name} buying group at ${ctx.accountName}.

Account: ${ctx.accountName} (${ctx.accountIndustry ?? 'Unknown industry'})
Segment: ${ctx.segment.name}
Value proposition for this segment: ${ctx.segment.valueProp ?? 'Not set'}
${ctx.triggerSignal ? `
TRIGGER: ${ctx.triggerSignal.title}
Context: ${ctx.triggerSignal.summary}
This signal suggests a new budget owner or stakeholder shift — the page should 
acknowledge the current moment at ${ctx.accountName}, not be evergreen.
` : ''}

Build:
1. A sales page with headline, 2-paragraph intro, 3 value props specific to this segment, 
   and a "Book a Demo" CTA
2. A short cold intro email (< 100 words) that links to the page

Keep messaging specific to ${ctx.segment.name} — not generic company messaging.
    `.trim(),
  },

  {
    id: 'event_invite',
    name: 'Event Invite',
    description: 'Send a personalized event invite to a buying group based on upcoming events.',
    triggerLabel: 'upcoming events match this segment',
    icon: '📅',
    pageType: 'event_invite',
    condition: { hasUpcomingEvents: true },
    buildPrompt: (ctx) =>
      `
Create an event invite sales page and email for the ${ctx.segment.name} segment at ${ctx.accountName}.

Event: ${ctx.events?.[0]?.name ?? 'Upcoming event'}
Date: ${ctx.events?.[0]?.date ?? 'TBD'}
Event description: ${ctx.events?.[0]?.description ?? ''}

Account: ${ctx.accountName}
Segment: ${ctx.segment.name}
Segment value prop: ${ctx.segment.valueProp ?? ''}

Build:
1. A sales page that explains why this event is relevant to ${ctx.segment.name} teams at 
   companies like ${ctx.accountName}, lists 2-3 sessions they should attend, 
   and has a "Register Now" CTA
2. A short invite email (< 80 words) that feels personal, not like a mass blast

Reference the segment's specific challenges — not generic "join us at our event" copy.
    `.trim(),
  },

  {
    id: 'feature_release',
    name: 'Feature Release',
    description: 'Share a relevant new feature with buying groups that have high product fit.',
    triggerLabel: 'new feature matches this segment',
    icon: '🚀',
    pageType: 'feature_announcement',
    condition: { hasRecentFeatureRelease: true },
    buildPrompt: (ctx) =>
      `
Create a feature announcement sales page and email for the ${ctx.segment.name} segment 
at ${ctx.accountName}.

New feature: ${ctx.featureRelease?.title ?? 'New feature'}
Released: ${ctx.featureRelease?.date ?? 'Recently'}
Feature description: ${ctx.featureRelease?.description ?? ''}

Account: ${ctx.accountName}
Segment: ${ctx.segment.name}
Segment value prop: ${ctx.segment.valueProp ?? ''}

Build:
1. A sales page that explains what this feature does specifically for 
   ${ctx.segment.name} teams — in their language, not product language.
   Include one before/after scenario. CTA: "See it in action"
2. A short email (< 80 words): "thought you'd want to see what we just shipped" tone — 
   not a product announcement blast

Do not use generic feature release language. Connect the feature directly to 
${ctx.segment.name} pain points.
    `.trim(),
  },

  {
    id: 're_engagement',
    name: 'Re-Engagement',
    description: 'Re-open a stalled buying group with new evidence and a fresh reason to talk.',
    triggerLabel: 'days since last activity — account may be stalling',
    icon: '🔄',
    pageType: 'account_intro',
    condition: { daysSinceLastActivity: 21 },
    buildPrompt: (ctx) =>
      `
Create a re-engagement sales page and email for the ${ctx.segment.name} segment 
at ${ctx.accountName}.

${ctx.triggerSignal ? `
REASON TO REACH OUT NOW — this is the primary hook, reference it directly:
What happened: ${ctx.triggerSignal.title}
Details: ${ctx.triggerSignal.summary}
Type: ${ctx.triggerSignal.type.replace(/_/g, ' ')}
Published: ${ctx.triggerSignal.publishedAt}

The email subject line and opening sentence MUST reference this specific event.
Do NOT write a generic "checking in" or "just following up" email.
` : `Days since last activity: ${ctx.segment.lastActivityDays ?? 'Unknown'} days.
Give them a reason to re-engage — not a reminder that time has passed.`}

Account: ${ctx.accountName}
Segment: ${ctx.segment.name}
${ctx.featureRelease ? `Supporting evidence (use if relevant): ${ctx.featureRelease.title} — ${ctx.featureRelease.description}` : ''}
${ctx.caseStudy ? `Supporting case study: ${ctx.caseStudy.title} — ${ctx.caseStudy.outcome}` : ''}
${ctx.events?.[0] ? `Upcoming event to mention: ${ctx.events[0].name} on ${ctx.events[0].date}` : ''}

Build:
1. A sales page framed around what changed — the signal event is the news hook, 
   your product is the solution. CTA: "Let's reconnect"
2. An email under 80 words. Subject line should reference the signal event directly.
   Tone: confident, not apologetic. One specific reason to talk now.
    `.trim(),
  },

  {
    id: 'champion_enablement',
    name: 'Champion Enablement',
    description: 'Build an executive-facing page your champion can share internally to get deal approved.',
    triggerLabel: 'champion engaged but no economic buyer contact yet',
    icon: '🏆',
    pageType: 'account_intro',
    condition: { hasChampionNoEconomicBuyer: true },
    buildPrompt: (ctx) =>
      `
Create a champion enablement sales page that ${ctx.championName ?? 'the champion'} 
can share with their executive/economic buyer at ${ctx.accountName}.

This page is NOT for the champion — it's for the executive who will approve the deal.
The champion will forward this link. The rep will not be in the room.

Account: ${ctx.accountName}
Segment: ${ctx.segment.name}
Champion: ${ctx.championName ?? 'Unknown'}
${ctx.caseStudy ? `Proof point: ${ctx.caseStudy.title} — ${ctx.caseStudy.outcome}` : ''}
${ctx.triggerSignal ? `
CURRENT CONTEXT AT ACCOUNT:
${ctx.triggerSignal.title} — ${ctx.triggerSignal.summary}
The executive reading this page is likely aware of this. The page should feel 
timely, not like a generic vendor pitch.
` : ''}

Build:
1. An executive-facing page:
   - Lead with business outcome (revenue, cost, risk) — not features
   - One proof point from a similar company
   - Simple ROI framing (time saved, revenue impact)
   - What a 30-day evaluation looks like
   - CTA: "Schedule 20-minute executive briefing"
2. A short email the champion can use to forward it: 
   "I've been working with [vendor] — thought you should see this before our next planning meeting."
   
No jargon. No feature lists. Executives buy outcomes.
    `.trim(),
  },
];

/** Display name for a PlayId (e.g. "Open New Buying Group"). Use for signals and UI labels. */
export function getPlayDisplayName(
  playId: PlayId | null | undefined
): string | null {
  if (!playId) return null;
  const play = PLAYS.find((p) => p.id === playId);
  return play?.name ?? null;
}
