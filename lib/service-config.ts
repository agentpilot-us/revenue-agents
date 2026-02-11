/**
 * Single source of truth for "is this service configured?" based on env vars.
 * Used by Settings UI and chat route so only configured tools are offered to the agent.
 */

const SERVICE_ENV_KEYS: Record<string, string[]> = {
  resend: ['RESEND_API_KEY'],
  cal: ['CAL_API_KEY'],
  clay: ['CLAY_API_KEY'],
  phantombuster: ['PHANTOMBUSTER_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY'],
  firecrawl: ['FIRECRAWL_API_KEY'],
} as const;

export type ServiceId = keyof typeof SERVICE_ENV_KEYS;

export function isServiceConfigured(serviceId: ServiceId): boolean {
  const keys = SERVICE_ENV_KEYS[serviceId];
  if (!keys?.length) return false;
  return keys.every((key) => {
    const v = process.env[key];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

/** Map chat tool id -> service id. Tools with no entry are always available (e.g. get_contacts_by_engagement). */
export const TOOL_TO_SERVICE: Record<string, ServiceId> = {
  search_linkedin_contacts: 'phantombuster',
  enrich_contact: 'clay',
  research_company: 'perplexity',
  send_email: 'resend',
  create_calendar_event: 'cal',
  get_calendar_rsvps: 'cal',
  import_event_attendees: 'cal',
};

export function isToolConfigured(toolId: string): boolean {
  const serviceId = TOOL_TO_SERVICE[toolId];
  if (!serviceId) return true; // no external service required
  return isServiceConfigured(serviceId);
}

export { SERVICE_ENV_KEYS };
