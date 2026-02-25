/**
 * buildSignalPlayHref
 *
 * Use this wherever a signal CTA links to create-content.
 * Replaces bare /chat?play=... links on signal cards with a
 * pre-filled create-content URL that carries signal context.
 *
 * Usage in your signal card component:
 *
 *   <Link href={buildSignalPlayHref({
 *     companyId: signal.companyId,
 *     playId: 're_engagement',
 *     segmentId: signal.suggestedSegmentId,   // optional
 *     segmentName: 'RevOps',                  // optional
 *     signalTitle: signal.title,
 *     signalSummary: signal.summary,
 *   })}>
 *     Run Re-Engagement play →
 *   </Link>
 */

export type SignalPlayHrefParams = {
  companyId: string;
  playId: string;
  segmentId?: string | null;
  segmentName?: string | null;
  signalTitle: string;
  signalSummary?: string | null;
};

export function buildSignalPlayHref({
  companyId,
  playId,
  segmentId,
  segmentName,
  signalTitle,
  signalSummary,
}: SignalPlayHrefParams): string {
  const base = `/dashboard/companies/${companyId}/create-content`;
  const params = new URLSearchParams();

  params.set('playId', playId);
  params.set('signalTitle', signalTitle);
  if (signalSummary) params.set('signalSummary', signalSummary);
  if (segmentName) params.set('segmentName', segmentName);
  if (segmentId) params.set('segmentId', segmentId);

  return `${base}?${params.toString()}`;
}

/**
 * Example: updating the Hot Signals card CTA
 *
 * BEFORE:
 *   ctaHref: `/chat?play=expansion&accountId=${companyId}&segmentId=${segmentId}`
 *
 * AFTER:
 *   ctaHref: buildSignalPlayHref({
 *     companyId,
 *     playId: signal.suggestedPlay ?? 're_engagement',
 *     segmentName: signal.segmentName,
 *     signalTitle: signal.title,
 *     signalSummary: signal.summary,
 *   })
 *
 * This is the only change needed in hot-signals.ts or wherever
 * the signal card CTAs are built.
 */
