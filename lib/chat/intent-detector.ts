/**
 * Detects user intent from the last chat message for selective context loading.
 * Safe fallback: general_question so account + memory are always available when unclear.
 */

export type ChatIntent =
  | 'draft_email'
  | 'research_company'
  | 'expansion_strategy'
  | 'find_contacts'
  | 'campaign_management'
  | 'general_question'
  | 'sequence_management'
  | 'event_invite'
  | 'feature_release_outreach';

export function detectIntent(lastUserMessage: string): ChatIntent {
  const msg = (lastUserMessage ?? '').trim().toLowerCase();
  if (!msg) return 'general_question';

  // Feature release outreach (before draft_email so release-focused phrasing gets dedicated instructions)
  if (/\b(feature|release|announcement|update|new capability|just launched|just released)\b/.test(msg)) return 'feature_release_outreach';

  // Event invite / webinar / session (before draft_email so "draft an invite to our webinar" gets events block)
  if (/\b(invite|webinar|session|agenda|event|register|attend|summit|conference)\b/.test(msg)) return 'event_invite';

  // Draft email / outreach (includes LinkedIn message, InMail, LinkedIn post)
  if (/\b(draft|email|outreach|write\s+(an?\s+)?email|compose|linkedin\s+message|inmail|linkedin\s+post)\b/.test(msg)) return 'draft_email';

  // Expansion strategy / phase / expand
  if (/\b(strategy|phase|expand|expansion|approach|best\s+way|departments?)\b/.test(msg)) return 'expansion_strategy';

  // Find contacts / titles
  if (/\b(find|who\s+(should|can|to)\s+contact|contacts?|titles?|vp\s+of|director\s+of)\b/.test(msg)) return 'find_contacts';

  // Research / overview / company info
  if (/\b(research|overview|tell\s+me\s+about|company\s+info|news|what('s|\s+is)\s+this\s+company)\b/.test(msg)) return 'research_company';

  // Campaign / landing / engagement
  if (/\b(campaign|landing\s+page|engagement|launch)\b/.test(msg)) return 'campaign_management';

  // Sequence / next touch / enrollment
  if (/\b(sequence|next\s+touch|enrollment|enroll)\b/.test(msg)) return 'sequence_management';

  return 'general_question';
}
