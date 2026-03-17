import { SECTION_TYPES_INSTRUCTION } from '@/lib/campaigns/constants';

/**
 * Build prompt for generating sales page sections (no chatbot).
 * Used by POST /api/companies/[companyId]/campaigns/generate
 */
export type PageType = 'feature_announcement' | 'event_invite' | 'account_intro' | 'case_study';

export type BuildSalesPagePromptParams = {
  pageType: PageType;
  companyName: string;
  segmentName: string;
  valueProp: string | null;
  eventsBlock: string | null;
  caseStudiesBlock: string | null;
  existingProductsBlock?: string | null;
  objectionsBlock?: string | null;
  userGoal?: string | null;
};

function buildContextBlocks(params: BuildSalesPagePromptParams): string {
  const parts: string[] = [];

  if (params.existingProductsBlock) {
    parts.push(params.existingProductsBlock);
    parts.push('Use the existing stack to tailor the hero (reference products they already own as a foundation). Include a comparison section if relevant.');
  }
  if (params.objectionsBlock) {
    parts.push(params.objectionsBlock);
    parts.push('Weave counter-narratives into value_props or include an faq section to proactively address these concerns.');
  }

  parts.push(SECTION_TYPES_INSTRUCTION);

  return parts.join('\n\n');
}

export function buildSalesPagePrompt(params: BuildSalesPagePromptParams): string {
  const {
    pageType,
    companyName,
    segmentName,
    valueProp,
    eventsBlock,
    caseStudiesBlock,
    userGoal,
  } = params;

  const goalBlock = userGoal?.trim()
    ? `\nRep goal: ${userGoal.trim()}`
    : '';

  const contextBlocks = buildContextBlocks(params);

  if (pageType === 'event_invite') {
    return `Create a sales page inviting ${segmentName} contacts at ${companyName} to attend an event.

${eventsBlock ? `EVENTS TO FEATURE:\n${eventsBlock}\n` : ''}
Account: ${companyName}
Segment: ${segmentName}
${valueProp ? `Value prop for this segment: ${valueProp}` : ''}${goalBlock}

Generate: a short headline, optional subheadline, and sections. Events marked with "Account Relevance" directly address this account's concerns or relate to their existing products — prioritize featuring those. Include an "event" section with name, date, location, description, registerUrl from the events above. Add value_props relevant to the segment. Add a clear CTA (e.g. "Register Now" with the event registration URL). Keep it concise — this is a page a rep sends directly to a prospect.

${contextBlocks}`;
  }

  if (pageType === 'feature_announcement') {
    return `Create a sales page announcing a new feature or product update for ${segmentName} at ${companyName}.

${valueProp ? `Value prop: ${valueProp}` : ''}
${caseStudiesBlock ? `Relevant proof (optional to reference):\n${caseStudiesBlock}` : ''}${goalBlock}

Generate: headline, optional subheadline, and sections. Include a hero, feature section (title, description, bullet points), a comparison section (before/after), value_props, and a cta section (e.g. "Book a Demo"). Keep it concise and rep-friendly.

${contextBlocks}`;
  }

  if (pageType === 'case_study') {
    return `Create a sales page that shares a case study with ${segmentName} contacts at ${companyName}.

${caseStudiesBlock ? `CASE STUDIES (pick one or synthesize):\n${caseStudiesBlock}` : ''}
${valueProp ? `Segment value prop: ${valueProp}` : ''}${goalBlock}

Generate: headline, optional subheadline, and sections. Include a hero, case_study section (company, result, optional quote), social_proof if metrics are available, and a CTA (e.g. "Learn more" or "Book a Demo"). Keep it short.

${contextBlocks}`;
  }

  // account_intro / default
  return `Create a short sales page for first-touch outreach to ${segmentName} at ${companyName}.

${valueProp ? `Value prop: ${valueProp}` : ''}
${eventsBlock ? `Optional events to mention (those marked "Account Relevance" are especially relevant to this account's concerns):\n${eventsBlock}` : ''}
${caseStudiesBlock ? `Optional proof:\n${caseStudiesBlock}` : ''}${goalBlock}

Generate: headline, optional subheadline, and sections. Start with a hero, include value_props with 3-4 items, add comparison or how_it_works if the context warrants it, optional event or case_study, and end with a cta. CTA label e.g. "Book a Demo" or "Learn More". Keep it concise.

${contextBlocks}`;
}
