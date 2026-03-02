/**
 * Pre-built prompt for Prep Me (talking points) flow.
 * Used by PrepMePanel when calling create-content API with contentType: 'talking_points'.
 */

export type PrepMePromptParams = {
  companyName: string;
  divisionName?: string;
  contactName?: string;
  contactTitle?: string;
  signalTitle?: string;
  signalSummary?: string;
};

/**
 * Build the prompt string for generateOneContent(..., contentType: 'talking_points').
 */
export function buildPrepMePrompt(params: PrepMePromptParams): string {
  const {
    companyName,
    divisionName,
    contactName,
    contactTitle,
    signalTitle,
    signalSummary,
  } = params;

  const parts: string[] = [];

  if (contactName || contactTitle) {
    const who = [contactName, contactTitle].filter(Boolean).join(' — ');
    const where = divisionName
      ? `${companyName}'s ${divisionName} division`
      : companyName;
    parts.push(
      `Pre-meeting prep for ${who} at ${where}.`
    );
  } else {
    const scope = divisionName
      ? `the ${divisionName} buying group at ${companyName}`
      : companyName;
    parts.push(`General prep for engaging ${scope}.`);
  }

  if (signalTitle || signalSummary) {
    const signalParts: string[] = [];
    if (signalTitle) signalParts.push(signalTitle);
    if (signalSummary) signalParts.push(signalSummary);
    parts.push(
      `Signal context: ${signalParts.join(' ')} Use this as the opening hook.`
    );
  }

  return parts.join('\n\n');
}
