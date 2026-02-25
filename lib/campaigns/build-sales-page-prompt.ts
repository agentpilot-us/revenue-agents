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
  userGoal?: string | null;
};

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

  if (pageType === 'event_invite') {
    return `Create a sales page inviting ${segmentName} contacts at ${companyName} to attend an event.

${eventsBlock ? `EVENTS TO FEATURE:\n${eventsBlock}\n` : ''}
Account: ${companyName}
Segment: ${segmentName}
${valueProp ? `Value prop for this segment: ${valueProp}` : ''}${goalBlock}

Generate: a short headline, optional subheadline, and sections. Include an "event" section with name, date, location, description, registerUrl from the events above. Add a clear CTA (e.g. "Register Now" with the event registration URL). Keep it concise — this is a page a rep sends directly to a prospect.`;
  }

  if (pageType === 'feature_announcement') {
    return `Create a sales page announcing a new feature or product update for ${segmentName} at ${companyName}.

${valueProp ? `Value prop: ${valueProp}` : ''}
${caseStudiesBlock ? `Relevant proof (optional to reference):\n${caseStudiesBlock}` : ''}${goalBlock}

Generate: headline, optional subheadline, and sections. Include a "feature" section (title, description, bullet points) and a "cta" section (e.g. "Book a Demo"). Keep it concise and rep-friendly.`;
  }

  if (pageType === 'case_study') {
    return `Create a sales page that shares a case study with ${segmentName} contacts at ${companyName}.

${caseStudiesBlock ? `CASE STUDIES (pick one or synthesize):\n${caseStudiesBlock}` : ''}
${valueProp ? `Segment value prop: ${valueProp}` : ''}${goalBlock}

Generate: headline, optional subheadline, and sections. Include a "case_study" section (company, result, optional quote) and a CTA (e.g. "Learn more" or "Book a Demo"). Keep it short.`;
  }

  // account_intro / default
  return `Create a short sales page for first-touch outreach to ${segmentName} at ${companyName}.

${valueProp ? `Value prop: ${valueProp}` : ''}
${eventsBlock ? `Optional events to mention:\n${eventsBlock}` : ''}
${caseStudiesBlock ? `Optional proof:\n${caseStudiesBlock}` : ''}${goalBlock}

Generate: headline, optional subheadline, and sections (e.g. hero, value_props, optional event or case_study, cta). CTA label e.g. "Book a Demo" or "Learn More". Keep it concise.`;
}
