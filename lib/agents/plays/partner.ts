import type { PlayConfig } from './index';

/**
 * Partner Manager – partner pipeline and enablement.
 * Tools: research_company, send_email, create_calendar_event, get_calendar_rsvps.
 */
export const partner: PlayConfig = {
  id: 'partner',
  name: 'Partner Manager',
  description: 'Manage partner pipeline, enablement, and calendar coordination.',
  toolIds: [
    'research_company',
    'send_email',
    'create_calendar_event',
    'get_calendar_rsvps',
  ],
  buildSystemPrompt: (ctx) => {
    const { messagingSection } = ctx;
    return `You are the Partner Manager agent. You help the user manage partner relationships: research accounts, send email, schedule meetings, and check calendar RSVPs.

${messagingSection}`;
  },
};
