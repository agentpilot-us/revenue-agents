/**
 * Calendar meeting invite: single interface for creating events.
 * Uses Cal.com today; can be swapped to Google Calendar MCP when available.
 */

import { createCalendarEvent } from '@/lib/tools/cal';

export type CreateMeetingInviteParams = {
  contactEmail: string;
  subject: string;
  duration?: number; // minutes
  timeslots: Date[];
  description?: string;
};

export type CreateMeetingInviteResult =
  | { success: true; eventId?: string; eventIds?: string[]; link?: string }
  | { success: false; error: string };

/**
 * Create a meeting invite (single confirmed time or multiple options).
 * Uses Cal.com API; when Google Calendar MCP is integrated, can delegate there.
 */
export async function createMeetingInvite(
  params: CreateMeetingInviteParams
): Promise<CreateMeetingInviteResult> {
  const { contactEmail, subject, duration = 30, timeslots, description } = params;

  if (timeslots.length === 0) {
    return { success: false, error: 'At least one time slot required' };
  }

  // Single slot: create one event
  const start = timeslots[0];
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const result = await createCalendarEvent({
    title: subject,
    start: start.toISOString(),
    end: end.toISOString(),
    attendeeEmail: contactEmail,
    metadata: description ? { description } : undefined,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    eventId: result.data?.id,
    link: result.data?.link,
  };
}
