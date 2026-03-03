/**
 * Tactical plays: single source of truth for the 5 plays (new buying group,
 * event invite, feature release, re-engagement, champion enablement).
 * Used by the play engine and execute-play.
 */

/**
 * Shared instruction block appended to every play prompt so the AI
 * produces sections in the exact typed format the renderer expects.
 */
export const SECTION_TYPES_INSTRUCTION = `
SECTION FORMAT — the page.sections array MUST use ONLY these typed section objects:
- { type: "hero", headline: string, body: string, backgroundContext?: string }
- { type: "value_props", items: [{ icon?: string (1 emoji), title: string, body: string }] }
- { type: "how_it_works", steps: [{ number: number, title: string, description: string }] }
- { type: "comparison", title?: string, withoutProduct: string, withProduct: string, rows?: [{ label: string, without: string, with: string }] }
- { type: "feature", title: string, description: string, bulletPoints: [string] }
- { type: "event", name: string, date: string, location: string, description: string, registerUrl: string }
- { type: "case_study", company: string, result: string, quote?: string }
- { type: "social_proof", metrics?: [{ value: string, label: string }], quotes: [{ text: string, author: string, title: string }] }
- { type: "faq", items: [{ question: string, answer: string }] }
- { type: "cta", headline: string, buttonLabel: string, buttonUrl: string, urgencyText?: string }

Produce 4-7 sections in a logical order. Always start with a "hero" section and end with a "cta" section.
Include a "value_props" section with 3-4 items. Use "comparison", "how_it_works", "faq", or "social_proof" when the context warrants it.
Do NOT invent section types beyond the list above.
`.trim();

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
1. A sales page with structured sections:
   - hero section with headline and intro body specific to ${ctx.segment.name}
   - value_props with 3-4 items tailored to this segment
   - If existing products are known, include a comparison section showing current state vs. with the new solution
   - If objections are known, include an faq section addressing them
   - cta section with "Book a Demo" button
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
1. A sales page with structured sections:
   - hero section explaining why this event matters to ${ctx.segment.name} teams at ${ctx.accountName}
   - event section with name, date, location, description, registerUrl
   - value_props with 2-3 sessions or topics relevant to this segment
   - cta section with "Register Now" button
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
1. A sales page with structured sections:
   - hero section framing the feature in ${ctx.segment.name} language (not product language)
   - feature section with title, description, and bullet points
   - comparison section showing before/after (without vs. with this feature)
   - If existing products are known, reference them in the hero backgroundContext
   - cta section with "See it in action" button
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
1. A sales page with structured sections:
   - hero section framed around what changed — the signal event is the news hook
   - value_props with 3 reasons to re-engage (tied to signal or new evidence)
   - If a case study is available, include a case_study section
   - If objections are known, include an faq section
   - social_proof with relevant metrics if available
   - cta section with "Let's reconnect" button
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
1. An executive-facing sales page with structured sections:
   - hero section leading with business outcome (revenue, cost, risk) — not features
   - value_props with 3 outcome-focused items (time saved, revenue impact, risk reduction)
   - If a case study is available, include a case_study section with proof point
   - how_it_works section showing what a 30-day evaluation looks like (3-4 steps)
   - If existing products are known, include a comparison section (current state vs. with the new solution)
   - cta section with "Schedule 20-minute executive briefing" button
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
