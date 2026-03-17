import type { PlayConfig } from './index';

/**
 * Customer Success – referral and advocacy play.
 * Tools: scrape_referral_examples, get_contacts_by_engagement, send_email, import_event_attendees.
 */
export const referral: PlayConfig = {
  id: 'referral',
  name: 'Referral & Advocacy',
  description: 'Drive referrals and customer advocacy: scrape examples, use engagement, import event attendees.',
  toolIds: [
    'scrape_referral_examples',
    'get_contacts_by_engagement',
    'send_email',
    'import_event_attendees',
  ],
  buildSystemPrompt: (ctx) => {
    const { messagingSection } = ctx;
    return `You are the Referral & Advocacy agent. You help the user drive referrals and customer advocacy: find referral examples, use engagement data, send email, and import event attendees.

${messagingSection}`;
  },
};
