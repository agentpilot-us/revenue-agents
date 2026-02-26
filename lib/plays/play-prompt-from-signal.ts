/**
 * buildPlayPromptFromSignal — shared prompt builder.
 * Used by run-content API and CreateContentClient's useEffect.
 * Keeps prompt wording in sync across both entry points.
 */
export function buildPlayPromptFromSignal(params: {
  playId: string;
  signalTitle: string;
  signalSummary?: string | null;
  segmentName?: string | null;
}): string {
  const { playId, signalTitle, signalSummary, segmentName } = params;

  const parts: string[] = [];

  if (segmentName) parts.push(`For the ${segmentName} buying group.`);
  parts.push(`Signal: ${signalTitle}.`);
  if (signalSummary) parts.push(signalSummary);

  switch (playId) {
    case 're_engagement':
      parts.push('Use this signal as the specific reason to re-engage — not a generic check-in. The email subject and opening must reference this event directly.');
      break;
    case 'feature_release':
      parts.push('Connect this signal to why the new feature matters for this team right now. Make the feature feel timely, not like a product blast.');
      break;
    case 'event_invite':
      parts.push('Use this signal as context for why attending this event is urgent and relevant for this account specifically.');
      break;
    case 'champion_enablement':
      parts.push('Generate content that the champion can share internally with their executive to get deal approval. Lead with business outcomes, not features.');
      break;
    case 'new_buying_group':
      parts.push('Generate an intro email and talking points for a buying group with no prior outreach. Make the opening specific to this team\'s pain points.');
      break;
    default:
      parts.push('Generate personalized outreach using this signal as the primary hook.');
  }

  return parts.join(' ');
}
