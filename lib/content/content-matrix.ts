/**
 * B2B ABM/ABS content type matrix: selling motions, stages, and content types
 * mapped to channels and prompt guidance. Used for content creation and
 * play planning so users create content and plans by intent/motion.
 */

import type { ChannelId } from './channel-config';

// ---------------------------------------------------------------------------
// Motion (lifecycle / selling motion)
// ---------------------------------------------------------------------------

export type MotionId =
  | 'new_logo'
  | 'upsell'
  | 'cross_sell'
  | 'renewal'
  | 'customer_success';

export interface Motion {
  id: MotionId;
  label: string;
  description: string;
  /** Short "stage context" shown as tooltip / sub-label to help reps self-qualify. */
  stageContext: string;
}

export const MOTIONS: Motion[] = [
  { id: 'new_logo', label: 'New Logo', description: 'First-time acquisition, brand awareness, ICP education', stageContext: 'Net-new prospect, no prior relationship' },
  { id: 'upsell', label: 'Upsell', description: 'Tier upgrade, advanced features, expansion within product', stageContext: 'Existing customer, expanding current product' },
  { id: 'cross_sell', label: 'Cross-sell', description: 'New product lines, modules, or solution areas', stageContext: 'Existing customer, new product line' },
  { id: 'renewal', label: 'Renewal', description: 'Contract renewal, retention, value proof, EBR/QBR', stageContext: 'Contract coming up for renewal' },
  { id: 'customer_success', label: 'Customer Success', description: 'Onboarding, adoption, health, advocacy', stageContext: 'Post-sale: onboarding, adoption, or health' },
];

// ---------------------------------------------------------------------------
// Stage (funnel / content category)
// ---------------------------------------------------------------------------

export type StageId =
  | 'awareness'
  | 'outreach'
  | 'consideration'
  | 'decision'
  | 'onboarding'
  | 'expansion'
  | 'abm';

export interface Stage {
  id: StageId;
  label: string;
}

export const STAGES: Stage[] = [
  { id: 'awareness', label: 'Awareness & Top-of-Funnel' },
  { id: 'outreach', label: 'Outreach & Engagement' },
  { id: 'consideration', label: 'Consideration & Evaluation' },
  { id: 'decision', label: 'Decision & Closing' },
  { id: 'onboarding', label: 'Onboarding & Adoption' },
  { id: 'expansion', label: 'Expansion & Retention' },
  { id: 'abm', label: 'ABM-Specific' },
];

// ---------------------------------------------------------------------------
// Content type (semantic type from matrix)
// ---------------------------------------------------------------------------

export interface ContentMatrixType {
  id: string;
  label: string;
  stage: StageId;
  /** Delivery channels we can generate for. Empty = task-only (e.g. reference call). */
  channelIds: ChannelId[];
  motions: MotionId[];
  /** Short prompt guidance for LLM. Optional per-motion override via getContentTypePromptSnippet. */
  promptSnippet: string;
}

export const CONTENT_MATRIX_TYPES: ContentMatrixType[] = [
  // Awareness
  { id: 'thought_leadership_blog', label: 'Thought Leadership Blog / Article', stage: 'awareness', channelIds: ['sales_page', 'email'], motions: ['new_logo'], promptSnippet: 'Thought leadership piece for brand awareness and ICP education. Authoritative, educational, no hard sell.' },
  { id: 'linkedin_post_social', label: 'LinkedIn Post / Social Content', stage: 'awareness', channelIds: ['linkedin_post'], motions: ['new_logo', 'upsell', 'cross_sell'], promptSnippet: 'LinkedIn post for brand presence and account warming. Conversational, value-first, engagement-focused.' },
  { id: 'podcast_webinar_recording', label: 'Podcast / Webinar Recording', stage: 'awareness', channelIds: ['video'], motions: ['new_logo', 'cross_sell'], promptSnippet: 'Script or outline for educational video/webinar. Build authority and introduce solution areas.' },
  { id: 'display_retargeting_ads', label: 'Display / Retargeting Ads', stage: 'awareness', channelIds: ['ad_brief'], motions: ['new_logo', 'upsell', 'cross_sell'], promptSnippet: 'Ad brief for account-level awareness or personalized feature/tier promotion. Clear headline, CTA, audience.' },
  { id: 'infographic_data_report', label: 'Infographic / Data Report', stage: 'awareness', channelIds: ['presentation', 'sales_page'], motions: ['new_logo', 'renewal', 'customer_success'], promptSnippet: 'Data-driven visual content for education and value reinforcement. Key stats, trends, takeaways.' },
  { id: 'executive_briefing_document', label: 'Executive Briefing Document', stage: 'awareness', channelIds: ['presentation'], motions: ['new_logo', 'renewal'], promptSnippet: 'C-suite engagement or business impact framing. Concise, strategic, 3–5 pages or slides.' },
  // Outreach
  { id: 'personalized_outreach_email', label: 'Personalized Outreach Email', stage: 'outreach', channelIds: ['email'], motions: ['new_logo', 'upsell', 'cross_sell', 'renewal'], promptSnippet: '1:1 outreach: intro/cold, trigger-based follow-up, or early renewal nudge. Personalized, one clear ask.' },
  { id: 'email_sequence_nurture', label: 'Email Sequence / Nurture Track', stage: 'outreach', channelIds: ['email'], motions: ['new_logo', 'customer_success'], promptSnippet: 'Multi-touch email sequence for education, objection handling, or onboarding drip. Consistent narrative.' },
  { id: 'linkedin_inmail', label: 'LinkedIn Direct Message / InMail', stage: 'outreach', channelIds: ['linkedin_inmail'], motions: ['new_logo', 'upsell'], promptSnippet: 'Warm intro or champion re-engagement. Respect character limits, one CTA.' },
  { id: 'video_email', label: 'Video Email (1:1 Personalized Video)', stage: 'outreach', channelIds: ['video', 'email'], motions: ['new_logo', 'upsell', 'renewal'], promptSnippet: 'Short personalized video script: intro, humanization, or EBR follow-up. Under 90 seconds, clear CTA.' },
  { id: 'direct_mail_gift', label: 'Direct Mail / Gift', stage: 'outreach', channelIds: [], motions: ['new_logo', 'renewal'], promptSnippet: 'Copy or brief for high-value account break-in or loyalty surprise. Memorable, on-brand.' },
  // Consideration
  { id: 'product_demo_live', label: 'Product Demo (Live)', stage: 'consideration', channelIds: ['demo_script'], motions: ['new_logo', 'cross_sell', 'upsell'], promptSnippet: 'Live demo script: solution fit, new module intro, or advanced feature showcase. Structured, outcome-focused.' },
  { id: 'demo_video_recorded', label: 'Demo Video (On-demand)', stage: 'consideration', channelIds: ['video', 'demo_script'], motions: ['new_logo', 'cross_sell'], promptSnippet: 'Recorded demo script for self-serve evaluation. Frictionless product education, clear next step.' },
  { id: 'case_study', label: 'Case Study', stage: 'consideration', channelIds: ['email', 'sales_page', 'presentation'], motions: ['new_logo', 'upsell', 'cross_sell', 'renewal'], promptSnippet: 'Social proof and risk reduction. Same-industry or expansion story; for renewal emphasize value proof.' },
  { id: 'roi_business_case_calculator', label: 'ROI / Business Case Calculator', stage: 'consideration', channelIds: ['sales_page', 'presentation'], motions: ['new_logo', 'upsell', 'renewal'], promptSnippet: 'Economic justification: expansion ROI or cost-of-switch for renewal. Numbers-driven, credible.' },
  { id: 'competitive_battlecard', label: 'Competitive Battlecard / Comparison', stage: 'consideration', channelIds: ['presentation', 'sales_page'], motions: ['new_logo', 'renewal'], promptSnippet: 'Objection handling and differentiation. Defend against displacement; fair, factual.' },
  { id: 'solution_brief_onepager', label: 'Solution Brief / One-Pager', stage: 'consideration', channelIds: ['presentation', 'sales_page', 'email'], motions: ['new_logo', 'cross_sell', 'upsell'], promptSnippet: 'Quick-send leave-behind or new product intro. One page, key value props, one CTA.' },
  { id: 'personalized_landing_page', label: 'Personalized Landing Page (microsite)', stage: 'consideration', channelIds: ['sales_page'], motions: ['new_logo', 'upsell'], promptSnippet: 'ABM named-account experience or tailored upgrade page. Headline, proof points, form/CTA.' },
  { id: 'proposal_map', label: 'Proposal / Mutual Action Plan (MAP)', stage: 'consideration', channelIds: ['presentation'], motions: ['new_logo', 'upsell', 'cross_sell', 'renewal'], promptSnippet: 'Deal closing or expansion scoping. Clear phases, mutual next steps, timeline.' },
  { id: 'security_compliance_doc', label: 'Security / Compliance Documentation', stage: 'consideration', channelIds: ['presentation', 'sales_page'], motions: ['new_logo', 'renewal'], promptSnippet: 'IT/Legal/Procurement risk reduction or ongoing compliance. Factual, structured.' },
  // Decision
  { id: 'business_value_assessment', label: 'Business Value Assessment (BVA)', stage: 'decision', channelIds: ['presentation'], motions: ['new_logo', 'renewal'], promptSnippet: 'Final justification for economic buyer or QBR/EBR value summary. Outcomes, metrics, recommendation.' },
  { id: 'ebr_deck', label: 'Executive Business Review (EBR) Deck', stage: 'decision', channelIds: ['presentation'], motions: ['renewal', 'customer_success'], promptSnippet: 'Retention, expansion discovery, health review, strategic roadmap. Executive-level, data-backed.' },
  { id: 'reference_customer_call', label: 'Reference Customer / Peer Call', stage: 'decision', channelIds: [], motions: ['new_logo', 'renewal'], promptSnippet: 'Briefing for reference or peer call: late-stage trust or advocacy. Talking points, not full script.' },
  { id: 'contract_pricing_proposal', label: 'Contract / Pricing Proposal', stage: 'decision', channelIds: ['presentation'], motions: ['new_logo', 'upsell', 'cross_sell', 'renewal'], promptSnippet: 'Close or expansion order form. Clear terms, pricing, and next steps.' },
  { id: 'champion_enablement_kit', label: 'Champion Enablement Kit', stage: 'decision', channelIds: ['presentation', 'email'], motions: ['new_logo', 'upsell', 'cross_sell'], promptSnippet: 'Internal selling support: equip champion to sell internally. Slides, email, talking points.' },
  // Onboarding & CS
  { id: 'onboarding_email_sequence', label: 'Onboarding Email Sequence', stage: 'onboarding', channelIds: ['email'], motions: ['customer_success'], promptSnippet: 'Guided activation and time-to-value. Drip sequence, clear milestones.' },
  { id: 'welcome_video', label: 'Welcome Video', stage: 'onboarding', channelIds: ['video'], motions: ['customer_success'], promptSnippet: 'Warm handoff from Sales, set expectations. Short, friendly, next steps.' },
  { id: 'training_howto_video', label: 'Training / How-to Video', stage: 'onboarding', channelIds: ['video'], motions: ['customer_success', 'upsell'], promptSnippet: 'Feature adoption and self-serve enablement or advanced feature education. Step-by-step.' },
  { id: 'onboarding_checklist_playbook', label: 'Onboarding Checklist / Playbook', stage: 'onboarding', channelIds: ['presentation', 'sales_page'], motions: ['customer_success', 'new_logo'], promptSnippet: 'Implementation milestone tracking or post-close handoff. Clear phases and owners.' },
  // Expansion & Retention
  { id: 'qbr_ebr_presentation', label: 'QBR / EBR Presentation', stage: 'expansion', channelIds: ['presentation'], motions: ['renewal', 'upsell', 'cross_sell'], promptSnippet: 'Health review, renewal negotiation, expansion discovery. Outcomes, roadmap, asks.' },
  { id: 'usage_adoption_report', label: 'Usage / Adoption Report', stage: 'expansion', channelIds: ['presentation'], motions: ['customer_success', 'renewal', 'upsell'], promptSnippet: 'Value realization proof and data-driven expansion conversation. Metrics, trends, recommendations.' },
  { id: 'personalized_upgrade_campaign', label: 'Personalized Upgrade Campaign', stage: 'expansion', channelIds: ['email', 'ad_brief'], motions: ['upsell', 'cross_sell'], promptSnippet: 'Tier upgrade or new product line intro. Email + ad angles, personalized.' },
  { id: 'testimonial_success_story_video', label: 'Testimonial / Success Story Video', stage: 'expansion', channelIds: ['video'], motions: ['renewal', 'new_logo'], promptSnippet: 'Reinforce value or social proof for late-stage outreach. Customer voice, outcomes.' },
  { id: 'product_roadmap_preview', label: 'Product Roadmap Preview', stage: 'expansion', channelIds: ['presentation'], motions: ['renewal', 'customer_success'], promptSnippet: 'Lock-in with future value; deepen engagement. High-level, exciting, no overcommit.' },
  { id: 'nps_csat_survey_followup', label: 'NPS / CSAT Survey + Follow-up', stage: 'expansion', channelIds: ['email'], motions: ['customer_success', 'renewal'], promptSnippet: 'Health signal capture and risk identification. Short, respectful, follow-up plan.' },
  // ABM-Specific
  { id: 'personalized_account_microsite', label: 'Personalized Account Microsite', stage: 'abm', channelIds: ['sales_page'], motions: ['new_logo', 'upsell'], promptSnippet: 'Named-account ABM experience or custom expansion story. Tailored messaging and proof.' },
  { id: 'custom_research_report', label: '1:1 Custom Research Report', stage: 'abm', channelIds: ['presentation', 'sales_page'], motions: ['new_logo', 'upsell'], promptSnippet: 'High-value account penetration or strategic insight gifting. Research-led, account-specific.' },
  { id: 'account_specific_abm_ad', label: 'Account-Specific ABM Ad Campaign', stage: 'abm', channelIds: ['ad_brief'], motions: ['new_logo', 'upsell', 'cross_sell'], promptSnippet: 'Warm account before outreach or keep expansion top-of-mind. Account-level creative brief.' },
  { id: 'intent_signal_triggered_content', label: 'Intent Signal-Triggered Content', stage: 'abm', channelIds: ['email', 'linkedin_inmail', 'linkedin_post'], motions: ['new_logo', 'upsell', 'cross_sell'], promptSnippet: 'Intercept in-market buyers or catch feature research signals. Timely, relevant, one CTA.' },
  { id: 'stakeholder_specific_faq', label: 'Stakeholder-Specific FAQ', stage: 'abm', channelIds: ['email', 'sales_page'], motions: ['new_logo', 'renewal'], promptSnippet: 'Finance, IT, Ops objection handling or multi-stakeholder justification. Q&A format.' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getMotions(): Motion[] {
  return MOTIONS;
}

export function getStages(): Stage[] {
  return STAGES;
}

export function getContentTypes(filters?: {
  motion?: MotionId;
  stage?: StageId;
  channelId?: ChannelId;
}): ContentMatrixType[] {
  let list = [...CONTENT_MATRIX_TYPES];
  if (filters?.motion) {
    list = list.filter((t) => t.motions.includes(filters.motion!));
  }
  if (filters?.stage) {
    list = list.filter((t) => t.stage === filters.stage);
  }
  if (filters?.channelId) {
    list = list.filter((t) => t.channelIds.includes(filters.channelId!));
  }
  return list;
}

export function getContentType(id: string): ContentMatrixType | undefined {
  return CONTENT_MATRIX_TYPES.find((t) => t.id === id);
}

/** Prompt snippet for (contentType, motion). Uses type’s default or motion-specific guidance. */
export function getContentTypePromptSnippet(
  contentTypeId: string,
  motionId?: MotionId,
): string {
  const t = getContentType(contentTypeId);
  if (!t) return '';
  return t.promptSnippet;
}

/** Default selling motion for an account type (for pre-selecting in UI). */
export function getDefaultMotionForAccount(accountType: string | null | undefined): MotionId {
  switch (accountType) {
    case 'prospect':
    case 'new_logo':
      return 'new_logo';
    case 'customer':
      return 'renewal';
    case 'partner':
      return 'new_logo';
    default:
      return 'new_logo';
  }
}

/** Build a compact summary of content types by motion for the suggest-plan AI. */
export function buildContentMatrixSummaryForAI(): string {
  const lines: string[] = [
    'CONTENT TYPES BY SELLING MOTION (use when suggesting content steps):',
  ];
  for (const motion of MOTIONS) {
    const types = getContentTypes({ motion: motion.id }).filter((t) => t.channelIds.length > 0);
    const names = types.slice(0, 14).map((t) => t.id).join(', ');
    const more = types.length > 14 ? ` (+${types.length - 14} more)` : '';
    lines.push(`- ${motion.id}: ${names}${more}`);
  }
  lines.push('For each content step, choose a contentType id that fits the step goal and account motion.');
  return lines.join('\n');
}

export const MOTION_IDS: MotionId[] = ['new_logo', 'upsell', 'cross_sell', 'renewal', 'customer_success'];
