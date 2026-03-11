export type ContentChannel =
  | 'email'
  | 'linkedin_inmail'
  | 'linkedin_post'
  | 'slack'
  | 'sms'
  | 'sales_page'
  | 'presentation'
  | 'ad_brief'
  | 'demo_script'
  | 'video'
  | 'one_pager'
  | 'talk_track'
  | 'champion_enablement'
  | 'map'
  | 'qbr_ebr_script';

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

  if (params.triggerId) search.set('signal', params.triggerId);
  if (params.divisionId) search.set('division', params.divisionId);
  if (params.channel) search.set('type', params.channel);
  if (params.contactId) search.set('contact', params.contactId);
  search.set('action', 'create');

  return `${base}?${search.toString()}`;
}
