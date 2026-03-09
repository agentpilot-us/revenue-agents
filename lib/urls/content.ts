export type ContentChannel =
  | 'email'
  | 'linkedin_inmail'
  | 'linkedin_post'
  | 'slack'
  | 'sms'
  | 'sales_page'
  | 'presentation';

type BuildContentUrlParams = {
  companyId: string;
  triggerId?: string;
  divisionId?: string;
  channel?: ContentChannel;
  contactId?: string;
};

/**
 * Build deep-link URL into the Target Company Content tab.
 */
export function buildContentUrl(params: BuildContentUrlParams): string {
  const base = `/dashboard/companies/${params.companyId}`;
  const search = new URLSearchParams({ tab: 'content' });

  if (params.triggerId) search.set('trigger', params.triggerId);
  if (params.divisionId) search.set('division', params.divisionId);
  if (params.channel) search.set('channel', params.channel);
  if (params.contactId) search.set('contact', params.contactId);

  return `${base}?${search.toString()}`;
}
