export type ConditionsContext = {
  accountTier: string | null;
  totalArr: number;
};

/** Conditions JSON: accountTier (string), accountTiers (string[]), arr_gt (number), arr_lt (number). */
export function conditionsMatch(conditions: unknown, ctx: ConditionsContext): boolean {
  if (conditions == null || typeof conditions !== 'object') return true;
  const c = conditions as Record<string, unknown>;
  if (c.accountTier != null) {
    const tier = typeof c.accountTier === 'string' ? c.accountTier : String(c.accountTier);
    const normalized = (ctx.accountTier ?? '').toLowerCase();
    if (normalized !== tier.toLowerCase()) return false;
  }
  if (Array.isArray(c.accountTiers) && c.accountTiers.length > 0) {
    const allowed = (c.accountTiers as string[]).map((t) => t.toLowerCase());
    const normalized = (ctx.accountTier ?? '').toLowerCase();
    if (!allowed.includes(normalized)) return false;
  }
  if (typeof c.arr_gt === 'number' && ctx.totalArr <= c.arr_gt) return false;
  if (typeof c.arr_lt === 'number' && ctx.totalArr >= c.arr_lt) return false;
  return true;
}
