/**
 * Per-lead seller voice for Stradex intake: derived snapshot in Company.agentContext.
 * Raw form inputs stay on Company.dealObjective / Company.researchGoal; prompts read stradexSellerProfile.
 */

export const STRADEX_SELLER_PROFILE_SCHEMA_VERSION = 1;

const DEMO_NOTE_PREFIX = 'Stradex free brief — selling:';

/** First line was produced by our template (create/refresh). Custom notes are left untouched. */
function firstLineIsStradexDemoTemplate(line: string | undefined): boolean {
  if (!line) return false;
  return /^\s*Stradex\s+free\s+brief/i.test(line);
}

export type StradexSellerProfile = {
  schemaVersion: number;
  companyName: string;
  website: string | null;
  oneLiner: string | null;
  motionSummary: string | null;
  challengeOrGoal: string | null;
  toneOrPositioningNotes: string | null;
  lastUpdatedAt: string;
};

export function buildStradexDemoNote(sellerCompanyName: string): string {
  const name = sellerCompanyName.trim();
  return `${DEMO_NOTE_PREFIX} ${name} — web intake (service user)`;
}

/**
 * Updates the first line only when it still matches our Stradex demoNote template (starts with
 * "Stradex free brief", case-insensitive). Preserves appended lines (e.g. manual review).
 * If an operator replaced or rewrote the first line, returns `currentDemoNote` unchanged so we
 * never prepend a duplicate or overwrite custom text.
 */
export function refreshStradexDemoNoteLine(
  currentDemoNote: string | null | undefined,
  sellerCompanyName: string
): string {
  const canonicalFirst = buildStradexDemoNote(sellerCompanyName);
  if (!currentDemoNote?.trim()) return canonicalFirst;

  const lines = currentDemoNote.split('\n');
  if (firstLineIsStradexDemoTemplate(lines[0])) {
    lines[0] = canonicalFirst;
    return lines.join('\n');
  }

  return currentDemoNote;
}

type StradexLeadCtx = {
  submitterName?: string;
  submitterEmail?: string;
  sellerCompany?: string;
  submittedAt?: string;
};

/**
 * Rebuild stradexSellerProfile from columns + prior context. Preserves website and toneOrPositioningNotes
 * from the previous profile. Syncs stradexLead.sellerCompany when stradexLead exists.
 */
export function rebuildStradexSellerProfile(params: {
  prevAgentContext: Record<string, unknown>;
  sellerCompanyName: string;
  dealObjective: string | null;
  researchGoal: string | null;
}): Record<string, unknown> {
  const prev = { ...params.prevAgentContext };
  const prevProfile = prev.stradexSellerProfile as StradexSellerProfile | undefined;
  const motion = params.dealObjective?.trim() || null;
  const challenge = params.researchGoal?.trim() || null;
  const oneLiner = [motion, challenge].filter(Boolean).join(' · ') || null;
  const companyName = params.sellerCompanyName.trim();

  const profile: StradexSellerProfile = {
    schemaVersion: STRADEX_SELLER_PROFILE_SCHEMA_VERSION,
    companyName,
    website: prevProfile?.website ?? null,
    oneLiner,
    motionSummary: motion,
    challengeOrGoal: challenge,
    toneOrPositioningNotes: prevProfile?.toneOrPositioningNotes ?? null,
    lastUpdatedAt: new Date().toISOString(),
  };

  prev.stradexSellerProfile = profile;

  const lead = prev.stradexLead as StradexLeadCtx | undefined;
  if (lead && typeof lead === 'object') {
    prev.stradexLead = { ...lead, sellerCompany: companyName };
  }

  return prev;
}

export function getStradexSellerProfile(agentContext: unknown): StradexSellerProfile | null {
  if (!agentContext || typeof agentContext !== 'object') return null;
  const p = (agentContext as { stradexSellerProfile?: unknown }).stradexSellerProfile;
  if (!p || typeof p !== 'object') return null;
  const o = p as StradexSellerProfile;
  if (typeof o.companyName !== 'string' || !o.companyName.trim()) return null;
  return o;
}

/** Prompt block: seller voice only (target account lines stay separate). */
export function buildStradexSellerVoicePromptBlock(profile: StradexSellerProfile): string {
  const lines: string[] = [
    `Selling on behalf of: ${profile.companyName}`,
    profile.website ? `Seller website (if known): ${profile.website}` : null,
    profile.oneLiner ? `Seller positioning (summary): ${profile.oneLiner}` : null,
    profile.motionSummary ? `Deal / motion focus: ${profile.motionSummary}` : null,
    profile.challengeOrGoal ? `Rep's goal / challenge: ${profile.challengeOrGoal}` : null,
    profile.toneOrPositioningNotes
      ? `Tone / positioning notes: ${profile.toneOrPositioningNotes}`
      : null,
    '',
    'Write the emails as a rep FROM the selling company above — not as StradexAI, not as a generic agency, and not using another vendor’s products unless they are the submitter’s.',
  ].filter((x): x is string => x != null && x !== '');

  return lines.join('\n');
}

export type StradexSellerProfilePatch = {
  companyName?: string;
  website?: string | null;
  toneOrPositioningNotes?: string | null;
};

/**
 * Apply ops patch, rebuild derived fields from company columns, then apply explicit website/tone overrides.
 */
export function mergeStradexSellerProfileAfterPatch(params: {
  prevAgentContext: Record<string, unknown>;
  dealObjective: string | null;
  researchGoal: string | null;
  patch: StradexSellerProfilePatch;
}): { agentContext: Record<string, unknown>; sellerCompanyName: string } {
  const lead = params.prevAgentContext.stradexLead as StradexLeadCtx | undefined;
  const prevProfile = params.prevAgentContext.stradexSellerProfile as StradexSellerProfile | undefined;
  const sellerCompanyName =
    params.patch.companyName?.trim() ||
    prevProfile?.companyName?.trim() ||
    lead?.sellerCompany?.trim() ||
    '';
  if (!sellerCompanyName) {
    throw new Error('Cannot resolve seller company name for Stradex profile patch.');
  }

  const ctx = rebuildStradexSellerProfile({
    prevAgentContext: params.prevAgentContext,
    sellerCompanyName,
    dealObjective: params.dealObjective,
    researchGoal: params.researchGoal,
  });

  const prof = ctx.stradexSellerProfile as StradexSellerProfile;
  if (params.patch.website !== undefined) prof.website = params.patch.website;
  if (params.patch.toneOrPositioningNotes !== undefined) {
    prof.toneOrPositioningNotes = params.patch.toneOrPositioningNotes;
  }
  prof.lastUpdatedAt = new Date().toISOString();

  return { agentContext: ctx, sellerCompanyName };
}
