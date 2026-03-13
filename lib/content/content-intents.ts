/**
 * Content intents: the high-level *purpose* of a piece of content.
 * Each intent can have channel-specific prompt guidance so the same
 * intent (e.g. "introduction") produces different structure for an email
 * vs a presentation vs a video script.
 *
 * Single source of truth — used by Content tab, content generate route,
 * play-step generation, and the AI custom play builder.
 */

import type { ChannelId } from './channel-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentIntentId =
  | 'introduction'
  | 'follow_up'
  | 'quick_signal_response'
  | 'new_feature'
  | 'value_proof'
  | 'renewal_nudge'
  | 'expansion_pitch'
  | 'onboarding_guide'
  | 'competitive_displacement'
  | 'event_invite'
  | 'custom';

export type MotionFilter = 'new_logo' | 'upsell' | 'cross_sell' | 'renewal' | 'customer_success';

export interface ContentIntent {
  id: ContentIntentId;
  label: string;
  /** Channels this intent applies to. Empty = all channels. */
  channels: ChannelId[];
  /** When set, this intent only appears for these selling motions. Empty = all motions. */
  motions: MotionFilter[];
}

// ---------------------------------------------------------------------------
// Intent definitions
// ---------------------------------------------------------------------------

const ALL_CHANNELS: ChannelId[] = [
  'email', 'linkedin_inmail', 'linkedin_post', 'slack', 'sms',
  'sales_page', 'presentation', 'ad_brief', 'demo_script', 'video',
  'generated_image', 'generated_video',
  'one_pager', 'talk_track', 'champion_enablement', 'map', 'qbr_ebr_script',
];

const MESSAGING_CHANNELS: ChannelId[] = [
  'email', 'linkedin_inmail', 'linkedin_post', 'slack', 'sms',
];

const RICH_CONTENT_CHANNELS: ChannelId[] = [
  'presentation', 'video', 'generated_image', 'generated_video', 'demo_script', 'ad_brief', 'one_pager',
  'talk_track', 'champion_enablement', 'map', 'qbr_ebr_script',
];

const ALL_MOTIONS: MotionFilter[] = [];

export const CONTENT_INTENTS: ContentIntent[] = [
  { id: 'introduction',              label: 'Introduction',              channels: ALL_CHANNELS,             motions: ALL_MOTIONS },
  { id: 'follow_up',                 label: 'Follow-up',                 channels: MESSAGING_CHANNELS,       motions: ALL_MOTIONS },
  { id: 'quick_signal_response',     label: 'Quick signal response',     channels: MESSAGING_CHANNELS,       motions: ALL_MOTIONS },
  { id: 'new_feature',               label: 'New feature / update',      channels: [...RICH_CONTENT_CHANNELS, 'email', 'linkedin_inmail', 'linkedin_post'], motions: ['new_logo', 'upsell', 'cross_sell'] },
  { id: 'value_proof',               label: 'Value proof / ROI',         channels: [...RICH_CONTENT_CHANNELS, 'email'], motions: ['renewal', 'customer_success', 'upsell'] },
  { id: 'renewal_nudge',             label: 'Renewal nudge',             channels: MESSAGING_CHANNELS,       motions: ['renewal'] },
  { id: 'expansion_pitch',           label: 'Expansion pitch',           channels: ALL_CHANNELS,             motions: ['upsell', 'cross_sell'] },
  { id: 'onboarding_guide',          label: 'Onboarding guide',          channels: [...RICH_CONTENT_CHANNELS, 'email'], motions: ['customer_success'] },
  { id: 'competitive_displacement',  label: 'Competitive displacement',  channels: [...RICH_CONTENT_CHANNELS, 'email', 'linkedin_inmail'], motions: ['new_logo'] },
  { id: 'event_invite',              label: 'Event invite',              channels: MESSAGING_CHANNELS,       motions: ALL_MOTIONS },
  { id: 'custom',                    label: 'Other / Custom',            channels: ALL_CHANNELS,             motions: ALL_MOTIONS },
];

// ---------------------------------------------------------------------------
// Channel-specific prompt snippets
// ---------------------------------------------------------------------------

type SnippetMap = Partial<Record<ChannelId, string>>;

const INTENT_SNIPPETS: Record<Exclude<ContentIntentId, 'custom'>, { generic: string; channels: SnippetMap }> = {
  introduction: {
    generic: 'This is a first-touch introduction. Establish relevance quickly, keep it concise, and end with one clear ask.',
    channels: {
      presentation: 'Create an intro deck (3-5 slides): who we are, how we can help this account, one case study in the same industry, and a suggested demo or next step. Keep slides visual and concise.',
      video: 'Intro video script: who we are, how we can help this account, one proof point, clear CTA. Keep it under 90 seconds.',
      generated_image: 'Create one polished visual that quickly communicates relevance for this account. Favor one strong concept over a collage of ideas.',
      generated_video: 'Create a short account-specific video with one clear narrative arc and a practical B2B visual style.',
      demo_script: 'Intro demo: hook on their pain, quick product walkthrough showing core value for this account, one proof point, clear next step.',
      ad_brief: 'Intro ad brief: capture attention with the account pain, position our value, one proof point, strong CTA.',
      sales_page: 'Intro sales page: compelling headline for this account, 3-5 value props, one case study, clear CTA.',
      one_pager: 'Intro one-pager: headline addressing their pain, 3 key value props specific to this account, one proof point, CTA.',
      talk_track: 'First meeting talk track: open with their world, connect to our value, one proof point, end with a discovery question.',
      champion_enablement: 'Champion intro kit: executive summary your champion can forward, internal email template, and 3-5 objection Q&As.',
    },
  },
  follow_up: {
    generic: 'This is a follow-up. Keep it brief — send-not material. Reference the prior contact or conversation, add one new insight, and keep the ask low-pressure.',
    channels: {},
  },
  quick_signal_response: {
    generic: 'This is a quick signal response. Keep it short. Reference the specific signal or event, connect it to our value, and include one CTA.',
    channels: {},
  },
  new_feature: {
    generic: 'This highlights a new feature or product update. Focus on what changed, why it matters to this specific account, and a clear next step.',
    channels: {
      presentation: 'New feature presentation: what is new, how it helps this target account specifically, one before/after or metric, suggested next step. 3-5 slides.',
      video: 'New feature video: what changed, why it matters for this account, quick walkthrough, clear CTA. Keep it under 2 minutes.',
      generated_image: 'Create one launch-ready product visual or campaign image that makes the new feature immediately legible.',
      generated_video: 'Create a short product-update video focused on the new capability and why it matters to this account.',
      demo_script: 'New feature demo: show the new capability, tie it to this account use case, compare before/after, clear ask.',
      ad_brief: 'New feature ad brief: lead with the update, tie to account pain, one proof point, strong CTA.',
    },
  },
  value_proof: {
    generic: 'Focus on proving ROI and value delivered. Reference specific metrics, outcomes, and business impact for this account. Back claims with data.',
    channels: {
      presentation: 'Value proof deck (3-5 slides): usage metrics, ROI calculation, business outcomes achieved, comparison to baseline, recommendation for next phase.',
      qbr_ebr_script: 'QBR value section: lead with metrics, show trend lines, connect to their strategic priorities, end with expansion recommendation.',
      one_pager: 'Value proof one-pager: headline metric, 3 key outcomes, one customer quote or case study, renewal/expansion CTA.',
    },
  },
  renewal_nudge: {
    generic: 'This is a renewal-focused touch. Remind them of value received, reference upcoming contract dates, and keep the tone warm and consultative — not pushy.',
    channels: {},
  },
  expansion_pitch: {
    generic: 'Pitch an expansion opportunity: new product line, additional seats, or tier upgrade. Ground it in their current usage and unmet needs.',
    channels: {
      presentation: 'Expansion deck (3-5 slides): current state and wins, gap analysis, proposed expansion, expected ROI, implementation timeline.',
      one_pager: 'Expansion one-pager: what they have today, what they are missing, proposed addition, expected outcome, next step.',
      champion_enablement: 'Champion expansion kit: internal business case, email template for budget holder, ROI talking points, FAQ for procurement.',
    },
  },
  onboarding_guide: {
    generic: 'Guide the customer through onboarding. Focus on time-to-value, key milestones, and quick wins. Friendly, supportive tone.',
    channels: {
      presentation: 'Onboarding deck: welcome, implementation phases, key milestones, support contacts, 30/60/90 day goals.',
      video: 'Onboarding video: welcome message, what to expect, first 3 steps to get started, support resources. Keep under 3 minutes.',
      generated_video: 'Create a short onboarding-style explainer video that highlights time-to-value, first steps, and confidence-building visuals.',
    },
  },
  competitive_displacement: {
    generic: 'Position against a competitor. Be factual, not disparaging. Focus on unique differentiation, switching benefits, and risk reduction.',
    channels: {
      presentation: 'Competitive comparison deck: side-by-side on key criteria, switching benefits, migration support, customer proof from similar switches.',
      one_pager: 'Competitive one-pager: key differentiators, migration support, one proof point from a similar switch, CTA.',
    },
  },
  event_invite: {
    generic: 'Invite to an upcoming event, webinar, or session. Reference why this specific event matters for their role or industry. Keep it brief with clear logistics.',
    channels: {},
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns intents available for a given channel and/or motion.
 * If no channel provided, returns all intents (optionally filtered by motion).
 */
export function getContentIntents(channelId?: ChannelId, motionId?: MotionFilter): ContentIntent[] {
  let list = CONTENT_INTENTS;
  if (channelId) {
    list = list.filter((i) => i.channels.length === 0 || i.channels.includes(channelId));
  }
  if (motionId) {
    list = list.filter((i) => i.motions.length === 0 || i.motions.includes(motionId));
  }
  return list;
}

/**
 * Returns the prompt snippet for a (intent, channel) pair.
 * Falls back to the generic snippet for the intent. Returns '' for custom.
 */
export function getContentIntentPromptSnippet(
  intentId: string,
  channelId?: string,
): string {
  if (intentId === 'custom' || !intentId) return '';
  const entry = INTENT_SNIPPETS[intentId as Exclude<ContentIntentId, 'custom'>];
  if (!entry) return '';
  if (channelId && entry.channels[channelId as ChannelId]) {
    return entry.channels[channelId as ChannelId]!;
  }
  return entry.generic;
}

/**
 * All valid intent ids — used for z.enum schemas.
 */
export const CONTENT_INTENT_IDS: [ContentIntentId, ...ContentIntentId[]] = [
  'introduction', 'follow_up', 'quick_signal_response', 'new_feature',
  'value_proof', 'renewal_nudge', 'expansion_pitch', 'onboarding_guide',
  'competitive_displacement', 'event_invite', 'custom',
];

/**
 * Build a short summary of content types and intents for an AI prompt
 * (e.g. suggest-plan). Lets the AI know what's available.
 */
export function buildContentModelSummaryForAI(): string {
  const lines: string[] = [
    'CONTENT TYPES AND INTENTS (use these when suggesting content-generation steps):',
  ];
  const channelGroups: Record<string, ContentIntentId[]> = {};
  for (const intent of CONTENT_INTENTS) {
    if (intent.id === 'custom') continue;
    for (const ch of intent.channels) {
      if (!channelGroups[ch]) channelGroups[ch] = [];
      channelGroups[ch].push(intent.id);
    }
  }
  const channelLabels: Record<string, string> = {
    email: 'Email', linkedin_inmail: 'LinkedIn InMail', linkedin_post: 'LinkedIn Post',
    slack: 'Slack DM', sms: 'Text/SMS', sales_page: 'Sales Page',
    presentation: 'Presentation', ad_brief: 'Ad Brief', demo_script: 'Demo Script', video: 'Video Script',
    generated_image: 'Generated Image', generated_video: 'Generated Video',
  };
  for (const [ch, intents] of Object.entries(channelGroups)) {
    const label = channelLabels[ch] || ch;
    const intentLabels = intents.map((id) => {
      const snippet = getContentIntentPromptSnippet(id, ch);
      return `${id} (${snippet.slice(0, 80)}${snippet.length > 80 ? '...' : ''})`;
    });
    lines.push(`- ${label}: ${intentLabels.join('; ')}`);
  }
  lines.push('- All channels also support "custom" (user provides free-text instructions).');
  return lines.join('\n');
}
