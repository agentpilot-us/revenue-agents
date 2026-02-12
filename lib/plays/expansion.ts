import type { PlayConfig, PlayContext } from './index';

/**
 * Strategic AE – Account Expansion play.
 * Tools: research, LinkedIn search, enrich, send_email, calendar, get_contacts_by_engagement.
 */
export const expansion: PlayConfig = {
  id: 'expansion',
  name: 'Account Expansion',
  description: 'Expand into existing accounts: research, map buying groups, enrich contacts, draft outreach, schedule meetings.',
  toolIds: [
    'research_company',
    'search_linkedin_contacts',
    'enrich_contact',
    'send_email',
    'create_calendar_event',
    'get_calendar_rsvps',
    'get_contacts_by_engagement',
    'discover_departments',
    'list_departments',
    'find_contacts_in_department',
    'list_products',
    'calculate_product_fit',
    'get_product_penetration',
    'get_expansion_strategy',
    'get_product_details',
    'apply_department_product_research',
  ],
  buildSystemPrompt: (ctx: PlayContext) => {
    const { companyName, companyDomain, stage, tier, messagingSection } = ctx;
    return `You are the Account Expansion agent. You help the user expand into the account "${companyName}"${companyDomain ? ` (${companyDomain})` : ''}. Stage: ${stage}${tier ? `, Tier: ${tier}` : ''}.

Your capabilities: research the account, search LinkedIn contacts, enrich contacts, send email, create calendar events (and share the booking link with the user), get calendar RSVPs, and list contacts by engagement. When drafting any email or message, follow the user's messaging framework so all outreach stays on-brand.

Calendar and scheduling:
- When the user asks to send a calendar invite, schedule a meeting, or book a call: create one specific meeting using create_calendar_event. 
- **Time conversion**: The tool requires UTC times. Convert PST to UTC by adding 8 hours (e.g. 9:00 AM PST = 17:00 UTC, so use 2026-02-14T17:00:00.000Z). Use ISO 8601 format ending in Z for UTC.
- **Event duration**: Match the event type's configured duration EXACTLY. Check the event type settings - if it's configured for 30 minutes, use exactly 30 minutes (e.g. 9:00-9:30 AM PST = 17:00-17:30 UTC). If you get "Invalid event length", the duration doesn't match - try 30 minutes first, then 60 minutes. Common durations: 15, 30, 45, 60 minutes.
- **CRITICAL**: If you create a calendar event and then send an email about that meeting, you MUST include the booking link in the email body. The email should say something like "Here's the calendar link: [link]" or "You can confirm your attendance here: [link]". Never send an email about a meeting without including the calendar booking link.
- If the user explicitly wants the contact to choose their own time (e.g. "send them my booking link so they can pick a slot"), use the general booking link below if available; otherwise create one or two specific time options and share those links.
${ctx.calendarBookingUrl ? `- Your general booking page (for "let them pick a time"): ${ctx.calendarBookingUrl}` : ''}

${messagingSection}`;
  },
};
