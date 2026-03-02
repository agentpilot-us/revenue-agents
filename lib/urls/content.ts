export type ContentChannel =
  | 'email'
  | 'linkedin_inmail'
  | 'linkedin_post'
  | 'slack'
  | 'sms'
  | 'sales_page';

export type PersonaLevel = 'csuite' | 'vp' | 'director' | 'all';

type BuildContentUrlParams = {
  companyId: string;
  triggerId?: string;
  divisionId?: string;
  channel?: ContentChannel;
  persona?: PersonaLevel;
  contactId?: string;
};

/**
 * Build deep-link URL into the Target Company Content tab.
 * Matches the mapping in AgentPilot_Content_Tab_URL_Mapping:
 * /dashboard/companies/[companyId]?tab=content&trigger=&division=&channel=&persona=&contact=
 */
export function buildContentUrl(params: BuildContentUrlParams): string {
  const base = `/dashboard/companies/${params.companyId}`;
  const search = new URLSearchParams({ tab: 'content' });

  if (params.triggerId) search.set('trigger', params.triggerId);
  if (params.divisionId) search.set('division', params.divisionId);
  if (params.channel) search.set('channel', params.channel);
  if (params.persona) search.set('persona', params.persona);
  if (params.contactId) search.set('contact', params.contactId);

  return `${base}?${search.toString()}`;
}

