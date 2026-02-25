/**
 * Deal context collected on the Account Intelligence page (Sections 1–5).
 * Persisted on Company.dealContext and used in the research prompt + Perplexity query.
 */
export type AccountStatus =
  | 'new'
  | 'existing_deployed'
  | 'existing_relationship'
  | 'stalled'
  | 'champion_in';

export type DealShape = 'single_team' | 'multi_department' | 'multi_division' | 'unknown';

export type BuyingMotion = 'standard' | 'committee' | 'regulated' | 'unknown';

export type DealContext = {
  productIds?: string[];
  /** When using Content Library products (no catalog), selected product names. */
  productNames?: string[];
  accountStatus?: AccountStatus;
  deployedLocation?: string;
  deployedUseCase?: string;
  hasProvenOutcomes?: boolean;
  relationshipLocation?: string;
  dealShape?: DealShape;
  targetDivisions?: string[];
  buyingMotion?: BuyingMotion;
  committeeName?: string;
  dealGoal?: string;
};

const DEFAULT_DEAL_CONTEXT: DealContext = {
  productIds: [],
  productNames: [],
  accountStatus: undefined,
  deployedLocation: undefined,
  deployedUseCase: undefined,
  hasProvenOutcomes: undefined,
  relationshipLocation: undefined,
  dealShape: undefined,
  targetDivisions: [],
  buyingMotion: undefined,
  committeeName: undefined,
  dealGoal: undefined,
};

const ACCOUNT_STATUSES: AccountStatus[] = [
  'new',
  'existing_deployed',
  'existing_relationship',
  'stalled',
  'champion_in',
];
const DEAL_SHAPES: DealShape[] = ['single_team', 'multi_department', 'multi_division', 'unknown'];
const BUYING_MOTIONS: BuyingMotion[] = ['standard', 'committee', 'regulated', 'unknown'];

function asAccountStatus(v: unknown): AccountStatus | undefined {
  if (typeof v !== 'string') return undefined;
  return ACCOUNT_STATUSES.includes(v as AccountStatus) ? (v as AccountStatus) : undefined;
}
function asDealShape(v: unknown): DealShape | undefined {
  if (typeof v !== 'string') return undefined;
  return DEAL_SHAPES.includes(v as DealShape) ? (v as DealShape) : undefined;
}
function asBuyingMotion(v: unknown): BuyingMotion | undefined {
  if (typeof v !== 'string') return undefined;
  return BUYING_MOTIONS.includes(v as BuyingMotion) ? (v as BuyingMotion) : undefined;
}

/**
 * Parse raw JSON (e.g. from Prisma Company.dealContext) into a normalized DealContext.
 * Used for initial form state and API validation.
 */
export function parseDealContext(raw: unknown): DealContext {
  if (raw == null || typeof raw !== 'object') {
    return { ...DEFAULT_DEAL_CONTEXT };
  }
  const o = raw as Record<string, unknown>;
  const productIds = Array.isArray(o.productIds)
    ? (o.productIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];
  const productNames = Array.isArray(o.productNames)
    ? (o.productNames as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const targetDivisions = Array.isArray(o.targetDivisions)
    ? (o.targetDivisions as unknown[])
        .filter((s): s is string => typeof s === 'string')
        .slice(0, 6)
    : [];
  return {
    ...DEFAULT_DEAL_CONTEXT,
    productIds: productIds.length ? productIds : DEFAULT_DEAL_CONTEXT.productIds,
    productNames: productNames.length ? productNames : DEFAULT_DEAL_CONTEXT.productNames,
    accountStatus: asAccountStatus(o.accountStatus),
    deployedLocation:
      typeof o.deployedLocation === 'string' ? o.deployedLocation : undefined,
    deployedUseCase: typeof o.deployedUseCase === 'string' ? o.deployedUseCase : undefined,
    hasProvenOutcomes:
      typeof o.hasProvenOutcomes === 'boolean' ? o.hasProvenOutcomes : undefined,
    relationshipLocation:
      typeof o.relationshipLocation === 'string' ? o.relationshipLocation : undefined,
    dealShape: asDealShape(o.dealShape),
    targetDivisions: targetDivisions.length ? targetDivisions : [],
    buyingMotion: asBuyingMotion(o.buyingMotion),
    committeeName: typeof o.committeeName === 'string' ? o.committeeName : undefined,
    dealGoal: typeof o.dealGoal === 'string' ? o.dealGoal : undefined,
  };
}
