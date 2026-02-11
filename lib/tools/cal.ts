/**
 * Cal.com – calendar booking and RSVPs.
 * Webhook events at /api/webhooks/cal.
 */

export type CreateCalendarEventParams = {
  title: string;
  start: string; // ISO
  end: string;
  attendeeEmail?: string;
  metadata?: Record<string, unknown>;
};

export type GetCalendarRsvpsParams = {
  eventSlug?: string;
  after?: string; // ISO date
};

export type CalResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<CalResult<{ link?: string; id?: string }>> {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'CAL_API_KEY not configured' };
  }
  const eventTypeId = process.env.CAL_EVENT_TYPE_ID;
  if (!eventTypeId) {
    return { ok: false, error: 'CAL_EVENT_TYPE_ID not configured' };
  }
  try {
    const body = {
      eventTypeId: Number(eventTypeId),
      start: params.start,
      end: params.end,
      title: params.title ?? 'Meeting',
      timeZone: 'UTC',
      language: 'en',
      status: 'PENDING', // Use PENDING if event type requires confirmation; change to ACCEPTED if auto-accept is needed
      responses: {
        name: params.attendeeEmail?.split('@')[0] || 'Guest', // Use email prefix as name if no name provided
        email: params.attendeeEmail || 'guest@example.com', // Cal.com requires non-empty email
        smsReminderNumber: '',
        location: { value: 'integrations:google:meet', optionValue: '' }, // Google Meet video call
      },
      metadata: params.metadata ?? {},
    };
    // Cal.com v1 auth is via query param apiKey, not Bearer (see cal.com/docs/api-reference/v1/authentication)
    const url = new URL('https://api.cal.com/v1/bookings');
    url.searchParams.set('apiKey', apiKey);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMessage = errText || res.statusText;
      try {
        const errJson = JSON.parse(errText);
        errMessage = errJson.message || errJson.error || errText;
      } catch {
        // Use errText as-is if not JSON
      }
      console.error('[create_calendar_event] Cal.com error:', {
        status: res.status,
        error: errMessage,
        requestBody: body,
      });
      return { ok: false, error: `Cal.com API ${res.status}: ${errMessage}` };
    }
    const data = (await res.json()) as {
      booking?: { uid?: string; id?: number; title?: string; startTime?: string; endTime?: string };
    };
    const booking = data?.booking;
    const uid = booking?.uid;
    const link = uid ? `https://app.cal.com/booking/${uid}` : undefined;
    return {
      ok: true,
      data: { link, id: uid ?? String(booking?.id ?? '') },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Create event failed' };
  }
}

export async function getCalendarRsvps(
  params: GetCalendarRsvpsParams
): Promise<CalResult<Array<{ email?: string; name?: string; status?: string }>>> {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'CAL_API_KEY not configured' };
  }
  try {
    return { ok: true, data: [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Get RSVPs failed' };
  }
}

export type GetCalendarRSVPsByEventIdResult = {
  eventId: string;
  status?: string;
  attendees: Array<{ email?: string; name?: string; status?: string }>;
  accepted: number;
  declined: number;
  pending: number;
};

/**
 * Get RSVPs for a single Cal.com booking by event/booking ID.
 */
export async function getCalendarRSVPs({
  eventId,
}: {
  eventId: string;
}): Promise<CalResult<GetCalendarRSVPsByEventIdResult>> {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'CAL_API_KEY not configured' };
  }
  try {
    const getUrl = new URL(`https://api.cal.com/v1/bookings/${eventId}`);
    getUrl.searchParams.set('apiKey', apiKey);
    const response = await fetch(getUrl.toString());
    if (!response.ok) {
      return {
        ok: false,
        error: `Cal.com API error: ${response.status} ${response.statusText}`,
      };
    }
    const booking = (await response.json()) as {
      status?: string;
      attendees?: Array<{ email?: string; name?: string; status?: string }>;
    };
    const attendees = booking?.attendees ?? [];
    return {
      ok: true,
      data: {
        eventId,
        status: booking?.status,
        attendees,
        accepted: attendees.filter((a) => (a.status ?? '').toUpperCase() === 'ACCEPTED').length,
        declined: attendees.filter((a) => (a.status ?? '').toUpperCase() === 'DECLINED').length,
        pending: attendees.filter((a) => (a.status ?? '').toUpperCase() === 'PENDING').length,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Get booking RSVPs failed',
    };
  }
}
