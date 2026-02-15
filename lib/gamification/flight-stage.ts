/**
 * Flight stage for account expansion (Runway → Landing).
 * Used on dashboard to show account progress.
 */

export type FlightStage =
  | 'Runway'
  | 'Taxiing'
  | 'Takeoff'
  | 'Cruising'
  | 'Approach'
  | 'Landing';

export type CompanyFlightStageParams = {
  researchData: unknown;
  contactCount: number;
  departmentCount: number;
  emailActivityCount: number;
  meetingActivityCount: number;
  hasWonPlay: boolean;
  hasOpportunity: boolean;
  hasDemoOrNegotiation: boolean;
};

/** Progress 0-100 by stage (for progress bar). */
const STAGE_PROGRESS: Record<FlightStage, number> = {
  Runway: 5,
  Taxiing: 20,
  Takeoff: 35,
  Cruising: 55,
  Approach: 78,
  Landing: 100,
};

/**
 * Compute flight stage and progress (0-100) for an account from aggregated data.
 */
export function getCompanyFlightStage(
  params: CompanyFlightStageParams
): { stage: FlightStage; progress: number } {
  const {
    researchData,
    contactCount,
    departmentCount,
    emailActivityCount,
    meetingActivityCount,
    hasWonPlay,
    hasOpportunity,
    hasDemoOrNegotiation,
  } = params;

  const hasResearchOrDepts =
    (researchData != null && typeof researchData === 'object' && Object.keys(researchData as object).length > 0) ||
    departmentCount > 0;
  const hasContacts = contactCount > 0;
  const hasEmail = emailActivityCount > 0;
  const hasMeeting = meetingActivityCount > 0;
  const hasEngagement = hasEmail && hasMeeting;
  const hasApproachSignals = hasOpportunity || hasDemoOrNegotiation;

  let stage: FlightStage;

  if (hasWonPlay) {
    stage = 'Landing';
  } else if (hasApproachSignals) {
    stage = 'Approach';
  } else if (hasEngagement) {
    stage = 'Cruising';
  } else if (hasContacts) {
    stage = 'Takeoff';
  } else if (hasResearchOrDepts) {
    stage = 'Taxiing';
  } else {
    stage = 'Runway';
  }

  return {
    stage,
    progress: STAGE_PROGRESS[stage],
  };
}

/**
 * Fetch activity counts and play flags for multiple companies (for dashboard).
 * Call with prisma and list of company ids; returns a map companyId -> params to pass to getCompanyFlightStage.
 */
export async function getFlightStageParamsForCompanies(
  prisma: import('@prisma/client').PrismaClient,
  companyIds: string[],
  companyData: Map<
    string,
    { researchData: unknown; contactCount: number; departmentCount: number }
  >
): Promise<Map<string, CompanyFlightStageParams>> {
  if (companyIds.length === 0) return new Map();

  const [emailGroups, meetingGroups, plays, opportunityRows] = await Promise.all([
    prisma.activity.groupBy({
      by: ['companyId'],
      where: { companyId: { in: companyIds }, type: 'Email' },
      _count: { id: true },
    }),
    prisma.activity.groupBy({
      by: ['companyId'],
      where: { companyId: { in: companyIds }, type: 'Meeting' },
      _count: { id: true },
    }),
    prisma.expansionPlay.findMany({
      where: { companyId: { in: companyIds } },
      select: { companyId: true, status: true },
    }),
    prisma.companyProduct.findMany({
      where: { companyId: { in: companyIds }, status: 'OPPORTUNITY' },
      select: { companyId: true },
    }),
  ]);

  const emailByCompany = new Map(
    emailGroups.map((g) => [g.companyId, g._count.id])
  );
  const meetingByCompany = new Map(
    meetingGroups.map((g) => [g.companyId, g._count.id])
  );
  const hasWonByCompany = new Map<string, boolean>();
  const hasDemoOrNegByCompany = new Map<string, boolean>();
  for (const p of plays) {
    if (p.status === 'WON') hasWonByCompany.set(p.companyId, true);
    if (p.status === 'DEMO_SCHEDULED' || p.status === 'NEGOTIATION')
      hasDemoOrNegByCompany.set(p.companyId, true);
  }
  const opportunityCompanyIds = new Set(opportunityRows.map((r) => r.companyId));

  const result = new Map<string, CompanyFlightStageParams>();
  for (const id of companyIds) {
    const data = companyData.get(id);
    if (!data) continue;
    result.set(id, {
      researchData: data.researchData,
      contactCount: data.contactCount,
      departmentCount: data.departmentCount,
      emailActivityCount: emailByCompany.get(id) ?? 0,
      meetingActivityCount: meetingByCompany.get(id) ?? 0,
      hasWonPlay: hasWonByCompany.get(id) ?? false,
      hasOpportunity: opportunityCompanyIds.has(id),
      hasDemoOrNegotiation: hasDemoOrNegByCompany.get(id) ?? false,
    });
  }
  return result;
}

/**
 * One-line summary for dashboard card (e.g. "8 contacts engaged, 3 meetings").
 */
export function getFlightStageSummary(params: {
  stage: FlightStage;
  contactCount: number;
  emailActivityCount: number;
  meetingActivityCount: number;
  hasOpportunity: boolean;
}): string {
  const {
    stage,
    contactCount,
    emailActivityCount,
    meetingActivityCount,
    hasOpportunity,
  } = params;

  if (stage === 'Landing') return 'Closed/won.';
  if (stage === 'Approach' && hasOpportunity)
    return 'Opportunity in progress.';
  if (stage === 'Cruising') {
    const parts: string[] = [];
    if (contactCount > 0) parts.push(`${contactCount} contact${contactCount !== 1 ? 's' : ''} engaged`);
    if (meetingActivityCount > 0)
      parts.push(`${meetingActivityCount} meeting${meetingActivityCount !== 1 ? 's' : ''}`);
    if (emailActivityCount > 0 && !parts.length) parts.push('Emails sent');
    return parts.length ? parts.join(', ') + '.' : 'Engaged.';
  }
  if (stage === 'Takeoff') {
    return contactCount > 0
      ? `${contactCount} contact${contactCount !== 1 ? 's' : ''} found, drafting outreach.`
      : 'Contacts found.';
  }
  if (stage === 'Taxiing')
    return 'Research or departments added, discovering contacts.';
  return 'Just created. Add research or contacts to take off.';
}
