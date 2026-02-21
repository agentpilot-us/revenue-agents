import type { ChatIntent } from './intent-detector';

export type ContextBlock =
  | 'account_research'
  | 'product_knowledge'
  | 'content_library'
  | 'rag_chunks'
  | 'case_studies'
  | 'industry_playbook'
  | 'events'
  | 'feature_releases'
  | 'campaigns'
  | 'agent_memory'
  | 'expansion_format'
  | 'persona_workflow'
  | 'messaging_framework';

export const INTENT_BLOCKS: Record<ChatIntent, ContextBlock[]> = {
  draft_email: [
    'account_research',
    'content_library',
    'rag_chunks',
    'case_studies',
    'campaigns',
    'persona_workflow',
    'agent_memory',
    'messaging_framework',
    'feature_releases',
  ],
  expansion_strategy: [
    'account_research',
    'product_knowledge',
    'industry_playbook',
    'expansion_format',
    'agent_memory',
  ],
  find_contacts: ['account_research', 'industry_playbook'],
  research_company: ['account_research', 'agent_memory'],
  campaign_management: ['campaigns', 'account_research'],
  sequence_management: ['account_research', 'content_library', 'agent_memory'],
  general_question: ['account_research', 'agent_memory'],
  event_invite: [
    'account_research',
    'events',
    'content_library',
    'persona_workflow',
    'campaigns',
    'agent_memory',
  ],
  feature_release_outreach: [
    'account_research',
    'feature_releases',
    'content_library',
    'case_studies',
    'campaigns',
    'persona_workflow',
    'agent_memory',
  ],
};
