/**
 * After starting a play, land on My Day with optional highlight for the new run's first step card.
 */
export function myDayUrlAfterPlayStart(playRunId: string, companyId: string): string {
  const p = new URLSearchParams();
  p.set('focusRun', playRunId);
  p.set('focusCompanyId', companyId);
  return `/dashboard?${p.toString()}`;
}
