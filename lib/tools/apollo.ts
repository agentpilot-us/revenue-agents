/**
 * Apollo.io – contact search and enrichment.
 * See: https://docs.apollo.io/reference/people-api-search
 * Provider abstraction lives in contact-finder.ts; this module implements Apollo.
 */

export type SearchApolloContactsParams = {
  companyDomain: string;
  companyName?: string;
  /** Title filters (e.g. from department targetRoles). */
  titles?: string[];
  /** Keywords for USE_CASE/DIVISIONAL segments (e.g. "autonomous driving ADAS"). */
  keywords?: string[];
  /** Seniority: vp, director, manager, c_suite, etc. */
  seniorityLevels?: string[];
  maxResults?: number;
};

export type ApolloPerson = {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  organization?: { primary_domain?: string };
  seniority?: string;
};

export type SearchApolloContactsResult =
  | { ok: true; people: ApolloPerson[] }
  | { ok: false; error: string };

/**
 * Search Apollo for people at an organization by domain.
 * When APOLLO_API_KEY is missing, returns stub data so the UI flow works.
 */
export async function searchApolloContacts(
  params: SearchApolloContactsParams
): Promise<SearchApolloContactsResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  const maxResults = Math.min(params.maxResults ?? 10, 50);

  if (!apiKey) {
    // Stub for demo without API key (same idea as PhantomBuster stub)
    const stubPeople: ApolloPerson[] = [
      { first_name: 'Lisa', last_name: 'Chen', name: 'Lisa Chen', title: 'Director, Quality Control', linkedin_url: 'https://linkedin.com/in/lisa-chen-gm' },
      { first_name: 'Robert', last_name: 'Kim', name: 'Robert Kim', title: 'Plant Manager', linkedin_url: 'https://linkedin.com/in/robert-kim-gm' },
      { first_name: 'Maria', last_name: 'Rodriguez', name: 'Maria Rodriguez', title: 'Director, Manufacturing Engineering', linkedin_url: 'https://linkedin.com/in/maria-rodriguez-gm' },
      { first_name: 'James', last_name: 'Wilson', name: 'James Wilson', title: 'Senior Quality Engineer', linkedin_url: 'https://linkedin.com/in/james-wilson-gm' },
      { first_name: 'Sarah', last_name: 'Lee', name: 'Sarah Lee', title: 'Operations Manager', linkedin_url: 'https://linkedin.com/in/sarah-lee-gm' },
    ].slice(0, maxResults);
    return { ok: true, people: stubPeople };
  }

  try {
    const body: Record<string, unknown> = {
      q_organization_domains: [params.companyDomain],
      per_page: maxResults,
      page: 1,
    };
    if (params.titles?.length) {
      body.person_titles = params.titles;
    }
    if (params.keywords?.length) {
      body.q_keywords = params.keywords.join(' ');
    }
    if (params.seniorityLevels?.length) {
      body.person_seniorities = params.seniorityLevels;
    }

    const res = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Apollo API ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      people?: ApolloPerson[];
      pagination?: { total_entries?: number };
    };
    const people = data.people ?? [];
    return { ok: true, people };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Apollo search failed',
    };
  }
}
