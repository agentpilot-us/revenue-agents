import type { PlayConfig, PlayContext } from './index';

/**
 * Strategic AE – Account Expansion play.
 * Tools: research, LinkedIn search, enrich, list contacts. No send_email or calendar here;
 * outbound sequences and email/calendar are handled by partner apps (Salesforce, HubSpot).
 * Email/calendar sending exists only on campaign landing page chat (/go/[id]).
 */
export const expansion: PlayConfig = {
  id: 'expansion',
  name: 'Account Expansion',
  description: 'Expand into existing accounts: research, map buying groups, enrich contacts, and list contacts. Use Salesforce or HubSpot for outbound sequences and email.',
  toolIds: [
    'research_company',
    'search_linkedin_contacts',
    'enrich_contact',
    'record_decision',
    'get_contacts_by_engagement',
    'discover_departments',
    'list_departments',
    'find_contacts_in_department',
    'list_products',
    'calculate_product_fit',
    'get_product_penetration',
    'get_expansion_strategy',
    'get_product_details',
    'apply_department_product_research',
  ],
  buildSystemPrompt: (ctx: PlayContext) => {
    const { companyName, companyDomain, stage, tier, messagingSection } = ctx;
    return `You are the Account Expansion agent. You help the user expand into the account "${companyName}"${companyDomain ? ` (${companyDomain})` : ''}. Stage: ${stage}${tier ? `, Tier: ${tier}` : ''}.

Your capabilities: research the account, search LinkedIn contacts, enrich contacts, and list contacts by engagement. When suggesting messaging or drafts, follow the user's messaging framework so outreach stays on-brand.

You do NOT send email or create calendar events from this chat. Outbound sequences, email, and calendar are handled in the user's CRM (e.g. Salesforce, HubSpot). You can draft copy or suggest next steps for the user to execute in their CRM. Campaign landing pages (/go/...) have their own chat that can email visitors (e.g. demo link, calendar link).

${messagingSection}`;
  },
};
