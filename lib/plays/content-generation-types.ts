/**
 * Content generation type definitions for play action steps.
 * Each type maps to a default prompt template used when ContentTemplate.contentGenerationType is set.
 * Context: account, division, contact, signal/trigger, industry playbook, product.
 */

export type ContentGenerationTypeDef = {
  /** Default prompt template; can include {{account.name}}, {{division.name}}, {{contact.name}}, {{signal.summary}}, {{governance.valueNarrative}}, etc. */
  promptTemplate: string;
  /** Suggested channel for this type. */
  channelHint: 'email' | 'linkedin' | 'meeting' | 'internal' | 'task' | 'phone' | 'sms' | 'any';
};

export const CONTENT_GENERATION_TYPES: Record<string, ContentGenerationTypeDef> = {
  congratulations_email: {
    channelHint: 'email',
    promptTemplate: `Write a personalized congratulations email to {{contact.name}} ({{contact.title}}) at {{account.name}} on their new role or promotion. Reference their previous role and company when relevant. Keep it warm and professional. {{governance.brandVoice}}`,
  },
  executive_intro_email: {
    channelHint: 'email',
    promptTemplate: `Draft a warm executive introduction email to {{contact.name}} at {{account.name}}. Reference mutual context (company, products, or signal). Use approved value narrative: {{governance.valueNarrative}}`,
  },
  value_prop_email: {
    channelHint: 'email',
    promptTemplate: `Write a value proposition email for {{account.name}} tailored to {{division.name}} and {{contact.title}}. Include product relevance, industry playbook alignment, and key pain points. {{governance.valueNarrative}}`,
  },
  roi_assessment_email: {
    channelHint: 'email',
    promptTemplate: `Draft an ROI framework email for {{account.name}} aligned to known objectives. Reference company financials, product usage, and division goals. Use approved messaging: {{governance.valueNarrative}}`,
  },
  early_win_email: {
    channelHint: 'email',
    promptTemplate: `Write a short email positioning a quick win to build credibility with {{contact.name}} at {{account.name}}. Reference products, division needs, and competitive context. {{governance.brandVoice}}`,
  },
  renewal_touchpoint_email: {
    channelHint: 'email',
    promptTemplate: `Draft a renewal-focused value reinforcement email for {{account.name}}. Reference contract dates, usage data, and expansion opportunities. {{governance.renewalMessaging}}`,
  },
  competitive_response_email: {
    channelHint: 'email',
    promptTemplate: `Draft a counter-positioning email for {{account.name}} in response to a competitor move. Use only approved competitive claims. Reference product differentiation and division context. {{governance.competitiveRules}}`,
  },
  follow_up_email: {
    channelHint: 'email',
    promptTemplate: `Write a follow-up email to {{contact.name}} at {{account.name}} referencing the last activity, meeting notes, and open items. Keep it concise and action-oriented.`,
  },
  event_invitation_email: {
    channelHint: 'email',
    promptTemplate: `Draft an event invitation email to {{contact.name}} at {{account.name}}. Include event details and why it's relevant to their division and interests. {{governance.brandVoice}}`,
  },
  linkedin_connection_note: {
    channelHint: 'linkedin',
    promptTemplate: `Write a personalized LinkedIn connection request note for {{contact.name}} ({{contact.title}}). Include mutual context and a clear reason to connect. Under 300 characters.`,
  },
  linkedin_engagement_comment: {
    channelHint: 'linkedin',
    promptTemplate: `Write a thoughtful comment on {{contact.name}}'s recent post. Reference company context and add value without being salesy. Keep it short.`,
  },
  linkedin_inmail: {
    channelHint: 'linkedin',
    promptTemplate: `Draft a LinkedIn InMail to {{contact.name}} at {{account.name}} with a specific value hook. Reference products, signal, or objective context. {{governance.valueNarrative}}`,
  },
  meeting_talking_points: {
    channelHint: 'meeting',
    promptTemplate: `Create structured talking points for a meeting with {{account.name}} ({{division.name}}): opening, pain points to explore, value props to emphasize, likely objections and responses, suggested next steps. Use full account context and product alignment.`,
  },
  meeting_agenda: {
    channelHint: 'meeting',
    promptTemplate: `Propose a meeting agenda for {{account.name}}. Include meeting purpose, attendees, and open items. Align to division and product context.`,
  },
  executive_briefing: {
    channelHint: 'internal',
    promptTemplate: `Write an internal executive briefing on {{contact.name}} ({{contact.title}}) at {{account.name}}. Include: background, LinkedIn/news, company strategy, tech stack, and recommended approach.`,
  },
  account_research_brief: {
    channelHint: 'internal',
    promptTemplate: `Create an internal research summary for {{account.name}}: company overview, {{division.name}} context, tech landscape, competitive positioning. Use industry playbook where relevant.`,
  },
  contact_research: {
    channelHint: 'task',
    promptTemplate: `Identify and describe contacts matching persona criteria in {{division.name}} at {{account.name}}. Include target roles, where to find them (LinkedIn, etc.), and relevance to the buying group.`,
  },
  calendar_invite: {
    channelHint: 'meeting',
    promptTemplate: `Draft copy for a calendar invite: meeting type, attendees, agenda summary, and location/link. Context: {{account.name}}, {{division.name}}.`,
  },
  phone_call_script: {
    channelHint: 'phone',
    promptTemplate: `Create a structured call script for {{contact.name}} at {{account.name}}: opening, objective, talking points, objection handling, and close. Reference {{governance.brandVoice}}.`,
  },
  custom_content: {
    channelHint: 'any',
    promptTemplate: `Generate content based on the following instructions. Account: {{account.name}}. Division: {{division.name}}. Contact: {{contact.name}} ({{contact.title}}). Use full context and approved messaging: {{governance.valueNarrative}}.\n\nInstructions: {{userInstructions}}`,
  },
};

/** Resolve prompt for a content generation type. Returns the template string; caller substitutes placeholders. */
export function getPromptTemplateForType(contentGenerationType: string): string | null {
  const def = CONTENT_GENERATION_TYPES[contentGenerationType];
  return def?.promptTemplate ?? null;
}

/** All valid content generation type keys (for dropdowns and validation). */
export const CONTENT_GENERATION_TYPE_KEYS = Object.keys(CONTENT_GENERATION_TYPES);
