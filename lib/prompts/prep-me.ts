/**
 * Pre-built prompt for Prep Me (talking points) flow.
 * Used by PrepMePanel when calling the shared content API for talk-track generation.
 */

export type EventAttendanceInfo = {
  eventName: string;
  eventDate: string;
  rsvpStatus?: string | null;
};

export type PrepMePromptParams = {
  companyName: string;
  companyId?: string;
  divisionName?: string;
  contactId?: string;
  contactName?: string;
  contactTitle?: string;
  signalTitle?: string;
  signalSummary?: string;
  /** Pre-formatted active objections block (e.g. from getActiveObjectionsBlock). Surfaces in LIKELY OBJECTIONS. */
  activeObjectionsFormatted?: string | null;
  /** Pre-formatted events block (ranked by account relevance). */
  eventsBlock?: string | null;
  /** Upcoming events this contact is attending. */
  contactEventAttendances?: EventAttendanceInfo[];
};

/**
 * Build the prompt string for generateOneContent(..., contentType: 'talking_points').
 */
export function buildPrepMePrompt(params: PrepMePromptParams): string {
  const {
    companyName,
    divisionName,
    contactName,
    contactTitle,
    signalTitle,
    signalSummary,
    activeObjectionsFormatted,
    eventsBlock,
    contactEventAttendances,
  } = params;

  const parts: string[] = [];

  if (contactName || contactTitle) {
    const who = [contactName, contactTitle].filter(Boolean).join(' — ');
    const where = divisionName
      ? `${companyName}'s ${divisionName} division`
      : companyName;
    parts.push(
      `Pre-meeting prep for ${who} at ${where}.`
    );
  } else {
    const scope = divisionName
      ? `the ${divisionName} buying group at ${companyName}`
      : companyName;
    parts.push(`General prep for engaging ${scope}.`);
  }

  if (signalTitle || signalSummary) {
    const signalParts: string[] = [];
    if (signalTitle) signalParts.push(signalTitle);
    if (signalSummary) signalParts.push(signalSummary);
    parts.push(
      `Signal context: ${signalParts.join(' ')} Use this as the opening hook.`
    );
  }

  if (contactEventAttendances && contactEventAttendances.length > 0) {
    const who = contactName || 'This contact';
    const eventLines = contactEventAttendances.map((ea) => {
      const status = ea.rsvpStatus ? ` (${ea.rsvpStatus})` : '';
      return `- ${ea.eventName} on ${ea.eventDate}${status}`;
    });
    parts.push(
      `UPCOMING EVENTS THIS CONTACT IS ATTENDING:\n${who} will be at:\n${eventLines.join('\n')}\nUse this in the OPENING section — reference the event and suggest a meeting or session to attend together. If relevant events from the company events list address their concerns, recommend specific sessions.`
    );
  }

  if (eventsBlock?.trim()) {
    parts.push(
      `${eventsBlock.trim()}\nWhen recommending events/sessions, prefer those marked with "Account Relevance" as they address this account's active concerns or relate to their existing products.`
    );
  }

  if (activeObjectionsFormatted?.trim()) {
    parts.push(
      `KNOWN ACTIVE OBJECTIONS FOR THIS ACCOUNT:\n${activeObjectionsFormatted.trim()}\nSurface these in the LIKELY OBJECTIONS section. Prioritize known objections over inferred ones.`
    );
  }

  return parts.join('\n\n');
}
