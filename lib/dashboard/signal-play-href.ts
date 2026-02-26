/**
 * buildSignalPlayHref
 *
 * Builds the URL for "Run [play]" CTAs on the dashboard.
 * Points to the new /plays/run page (Option B) instead of create-content.
 *
 * Usage in signal cards, next-best-actions, hot signals panel:
 *
 *   <Link href={buildSignalPlayHref({
 *     companyId: signal.companyId,
 *     playId: 're_engagement',
 *     signalId: signal.id,           // preferred — run page loads signal from DB
 *     segmentName: 'RevOps',
 *     signalTitle: signal.title,     // fallback if signalId not available
 *     signalSummary: signal.summary,
 *   })}>
 *     Run Re-Engagement play →
 *   </Link>
 */

type SignalPlayHrefParams = {
  companyId: string;
  playId?: string;
  segmentId?: string | null;
  segmentName?: string | null;
  signalTitle?: string;
  signalSummary?: string | null;
  /** When provided, run page loads signal from DB — inline params become fallback */
  signalId?: string | null;
};

export function buildSignalPlayHref({
  companyId,
  playId,
  segmentId,
  segmentName,
  signalTitle,
  signalSummary,
  signalId,
}: SignalPlayHrefParams): string {
  // New destination: dedicated play run page
  const base = `/dashboard/companies/${companyId}/plays/run`;
  const params = new URLSearchParams();

  // signalId lets the run page load everything from DB — minimal URL
  if (signalId) {
    params.set('signalId', signalId);
    // Still pass inline params as fallback / display hints
    if (playId) params.set('playId', playId);
    if (segmentName) params.set('segmentName', segmentName);
    if (segmentId) params.set('segmentId', segmentId);
  } else {
    // No signalId — pass everything inline
    if (playId) params.set('playId', playId);
    if (signalTitle) params.set('signalTitle', signalTitle);
    if (signalSummary) params.set('signalSummary', signalSummary);
    if (segmentName) params.set('segmentName', segmentName);
    if (segmentId) params.set('segmentId', segmentId);
  }

  return `${base}?${params.toString()}`;
}

/**
 * buildNextBestActionHref
 *
 * For next-best-action items that have no signal (engine-suggested plays).
 * Still points to the run page but uses play context params directly.
 *
 * Usage in next-best-actions panel:
 *
 *   ctaHref: buildNextBestActionHref({
 *     companyId: company.id,
 *     playId: suggestion.play.id,
 *     segmentId: suggestion.segment.id,
 *     segmentName: suggestion.segment.name,
 *     triggerText: suggestion.triggerText,
 *   })
 */
export function buildNextBestActionHref({
  companyId,
  playId,
  segmentId,
  segmentName,
  triggerText,
}: {
  companyId: string;
  playId: string;
  segmentId?: string;
  segmentName?: string;
  triggerText?: string;
}): string {
  const base = `/dashboard/companies/${companyId}/plays/run`;
  const params = new URLSearchParams();
  params.set('playId', playId);
  if (segmentId) params.set('segmentId', segmentId);
  if (segmentName) params.set('segmentName', segmentName);
  // triggerText becomes a synthetic "signal title" so the run page has a hook
  if (triggerText) params.set('signalTitle', triggerText);
  return `${base}?${params.toString()}`;
}
