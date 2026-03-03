import type { PlayConfig, PlayContext } from './index';

/**
 * Strategic AE – Account Expansion play.
 *
 * Core tools: research, LinkedIn search, enrich, list contacts, run plays.
 * Delivery tools: execute_expansion_plan (autonomous multi-step workflow),
 *   send_email (single email with approval), launch_campaign.
 */
export const expansion: PlayConfig = {
  id: 'expansion',
  name: 'Account Expansion',
  description: 'Expand into existing accounts: research, map buying groups, enrich contacts, run plays, and execute full expansion plans autonomously.',
  toolIds: [
    // Research & discovery
    'research_company',
    'search_linkedin_contacts',
    'enrich_contact',
    'discover_departments',
    'list_departments',
    'find_contacts_in_department',
    'get_contacts_by_engagement',
    // Product intelligence
    'list_products',
    'calculate_product_fit',
    'get_product_penetration',
    'get_expansion_strategy',
    'get_product_details',
    'apply_department_product_research',
    // Execution
    'run_play',
    'execute_expansion_plan',
    'send_email',
    'launch_campaign',
    'record_decision',
    'record_objection',
    // Deployment
    'deploy_sales_page_to_vercel',
    'deploy_custom_landing_page',
  ],
  buildSystemPrompt: (ctx: PlayContext) => {
    const { companyName, companyDomain, stage, tier, messagingSection } = ctx;
    return `You are the Account Expansion agent. You help the user expand into the account "${companyName}"${companyDomain ? ` (${companyDomain})` : ''}. Stage: ${stage}${tier ? `, Tier: ${tier}` : ''}.

Your capabilities:
- Research the account, search LinkedIn contacts, enrich contacts, and list contacts by engagement
- Execute full expansion plans autonomously (generate sales page + send email + create briefing) using execute_expansion_plan
- Run individual plays (event invite, re-engagement, champion enablement) using run_play
- Send individual emails (with user approval) using send_email
- Launch campaign landing pages using launch_campaign

When the user asks to "run a plan" or "execute a campaign" for an account with a specific product, use execute_expansion_plan. This runs a multi-step workflow that generates content, publishes pages, sends emails, and creates briefings.

When suggesting messaging or drafts, follow the user's messaging framework so outreach stays on-brand.

${messagingSection}`;
  },
};
