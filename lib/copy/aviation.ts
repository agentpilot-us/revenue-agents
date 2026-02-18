/**
 * Aviation-themed copy for empty states, success messages, and loading.
 * Keeps tone professional but playful.
 */

export const aviationCopy = {
  empty: {
    noCompanies: {
      title: 'Ready for takeoff?',
      body: 'Create your first target account to begin the expansion journey.',
      cta: 'Add your first target company',
    },
    noContacts: {
      title: 'Time to assemble your crew.',
      body: 'Let the agent discover stakeholders in this account.',
    },
    approvalQueueEmpty: {
      title: 'All clear!',
      body: 'No pending actions. Want to draft more outreach?',
    },
    noRecentActivity: {
      title: 'No recent activity',
      body: 'Send an email or schedule a meeting via chat to see it here.',
    },
  },
  success: {
    emailSent: 'En route! Email cleared for takeoff. Tracking engagement now.',
    meetingBooked: (name: string, date: string) =>
      `Direct hit! ${name} accepted your invite. Meeting: ${date}.`,
    opportunityLogged: (amount: string) =>
      `${amount} opportunity logged. Keep cruising!`,
  },
  loading: {
    researching: (company: string) =>
      `Researching ${company}'s org structure…`,
    scanningLinkedIn: 'Scanning LinkedIn for contacts…',
    enrichingContacts: (count?: number) =>
      count ? `Enriching ${count} contacts with Clay…` : 'Enriching contacts with Clay…',
    craftingMessaging: 'Crafting microsegment messaging…',
  },
} as const;
