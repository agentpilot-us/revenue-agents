/**
 * Primary workspace for a play run: roster, steps, generate, send.
 */
export function playRunWorkspaceUrl(companyId: string, playRunId: string): string {
  return `/dashboard/companies/${companyId}/plays/run/${playRunId}`;
}

/**
 * My Day with optional highlight for a run card (secondary entry from run page).
 */
export function myDayUrlAfterPlayStart(playRunId: string, companyId: string): string {
  const p = new URLSearchParams();
  p.set('focusRun', playRunId);
  p.set('focusCompanyId', companyId);
  return `/dashboard?${p.toString()}`;
}
