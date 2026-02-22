/**
 * Contact finder – provider abstraction for finding contacts by segment.
 * Swap provider via CONTACT_FINDER_PROVIDER (apollo | clay). Default: apollo.
 */

import { searchApolloContacts } from './apollo';

export type ContactFinderResult = {
  firstName: string;
  lastName: string;
  title: string;
  department?: string;
  linkedinUrl?: string;
  email?: string;
  seniority?: string;
  confidence: 'high' | 'medium' | 'low';
};

export type FindContactsForSegmentParams = {
  companyDomain: string;
  companyName: string;
  /** Role/title hints from department (e.g. targetRoles). */
  targetRoles?: string[];
  maxResults?: number;
  provider?: 'apollo' | 'clay';
};

/**
 * Find contacts for a segment (buying group). Uses Apollo by default; provider
 * can be overridden via param or CONTACT_FINDER_PROVIDER env.
 */
export async function findContactsForSegment(
  params: FindContactsForSegmentParams
): Promise<ContactFinderResult[]> {
  const provider =
    params.provider ??
    (process.env.CONTACT_FINDER_PROVIDER as 'apollo' | 'clay' | undefined) ??
    'apollo';

  switch (provider) {
    case 'apollo':
      return findViaApollo(params);
    case 'clay':
      return findViaApollo(params); // Clay as finder not implemented; use Apollo path
    default:
      return findViaApollo(params);
  }
}

async function findViaApollo(
  params: FindContactsForSegmentParams
): Promise<ContactFinderResult[]> {
  const domain =
    params.companyDomain.replace(/^www\./, '').split('/')[0] || params.companyDomain;
  const seniorityLevels = ['vp', 'director', 'manager', 'c_suite', 'senior'];

  const result = await searchApolloContacts({
    companyDomain: domain,
    companyName: params.companyName,
    titles: params.targetRoles?.length ? params.targetRoles : undefined,
    seniorityLevels,
    maxResults: params.maxResults ?? 15,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.people.map((p) => {
    const firstName = p.first_name ?? p.name?.split(/\s+/)[0] ?? '';
    const lastName = p.last_name ?? p.name?.split(/\s+/).slice(1).join(' ') ?? '';
    return {
      firstName,
      lastName,
      title: p.title ?? '',
      department: undefined,
      linkedinUrl: p.linkedin_url ?? undefined,
      email: p.email ?? undefined,
      seniority: p.seniority ?? undefined,
      confidence: 'medium' as const,
    };
  });
}
