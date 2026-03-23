/**
 * Thresholds for My Company setup progress UI.
 * Tune here without touching API route logic.
 */

export const SETUP_THRESHOLDS = {
  /** Catalog products — partial at 1, complete at 2+ */
  productsComplete: 2,
  productsPartial: 1,
  /** Total content library items — partial 1–2, complete 3+ */
  contentComplete: 3,
  contentPartial: 1,
  /** At least one messaging framework */
  messagingMin: 1,
  /** At least one industry playbook */
  playbooksMin: 1,
  /** At least one ACTIVE play template */
  activeTemplatesMin: 1,
  /** At least one signal→play mapping */
  signalMappingsMin: 1,
} as const;

export type StepStatus = 'complete' | 'partial' | 'empty';

export function statusFromCounts(
  count: number,
  partialMin: number,
  completeMin: number,
): StepStatus {
  if (count >= completeMin) return 'complete';
  if (count >= partialMin) return 'partial';
  return 'empty';
}
