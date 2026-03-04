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
  last_name_obfuscated?: string;
  name?: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  organization?: { primary_domain?: string; name?: string };
  seniority?: string;
};

export type SearchApolloContactsResult =
  | { ok: true; people: ApolloPerson[] }
  | { ok: false; error: string };

/** Generic placeholder contacts when APOLLO_API_KEY is missing. Works in any demo context. */
function getStubPeople(companyName?: string, maxResults: number = 10): ApolloPerson[] {
  const slug = (companyName ?? 'company').replace(/\s+/g, '-').toLowerCase().slice(0, 12);
  const placeholders: ApolloPerson[] = [
    { first_name: 'Alex', last_name: 'Johnson', name: 'Alex Johnson', title: 'VP Sales Operations', linkedin_url: `https://linkedin.com/in/alex-johnson-${slug}` },
    { first_name: 'Jordan', last_name: 'Smith', name: 'Jordan Smith', title: 'Director of Engineering', linkedin_url: `https://linkedin.com/in/jordan-smith-${slug}` },
    { first_name: 'Sam', last_name: 'Williams', name: 'Sam Williams', title: 'Head of Product', linkedin_url: `https://linkedin.com/in/sam-williams-${slug}` },
    { first_name: 'Taylor', last_name: 'Brown', name: 'Taylor Brown', title: 'Director, Business Development', linkedin_url: `https://linkedin.com/in/taylor-brown-${slug}` },
    { first_name: 'Casey', last_name: 'Davis', name: 'Casey Davis', title: 'Senior Manager, Operations', linkedin_url: `https://linkedin.com/in/casey-davis-${slug}` },
    { first_name: 'Morgan', last_name: 'Miller', name: 'Morgan Miller', title: 'VP Marketing', linkedin_url: `https://linkedin.com/in/morgan-miller-${slug}` },
    { first_name: 'Riley', last_name: 'Garcia', name: 'Riley Garcia', title: 'Director, Customer Success', linkedin_url: `https://linkedin.com/in/riley-garcia-${slug}` },
    { first_name: 'Avery', last_name: 'Martinez', name: 'Avery Martinez', title: 'Head of Partnerships', linkedin_url: `https://linkedin.com/in/avery-martinez-${slug}` },
    { first_name: 'Quinn', last_name: 'Anderson', name: 'Quinn Anderson', title: 'Director, Strategy', linkedin_url: `https://linkedin.com/in/quinn-anderson-${slug}` },
    { first_name: 'Reese', last_name: 'Thomas', name: 'Reese Thomas', title: 'Senior Director, Sales', linkedin_url: `https://linkedin.com/in/reese-thomas-${slug}` },
  ];
  return placeholders.slice(0, maxResults);
}

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
    return { ok: true, people: getStubPeople(params.companyName, maxResults) };
  }

  try {
    const res = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        page: 1,
        per_page: maxResults,
        q_organization_domains_list: [params.companyDomain],
        person_titles: params.titles ?? [],
        q_keywords: params.keywords?.length ? params.keywords.join(' ') : undefined,
        person_seniorities: params.seniorityLevels ?? [],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const short = text.slice(0, 200);
      if (res.status === 401) {
        return {
          ok: false,
          error: `Apollo API 401: Account or API key inactive. Contact support@apollo.io to regain access. Raw: ${short}`,
        };
      }
      if (res.status === 403 && text.includes('API_INACCESSIBLE')) {
        return {
          ok: false,
          error: `Apollo API 403: Your API key doesn't have access to People Search. In Apollo: Settings → Integrations → API Keys, create a key and enable "Set as master key" or grant access to the People Search endpoint. Raw: ${short}`,
        };
      }
      return { ok: false, error: `Apollo API ${res.status}: ${short}` };
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

/** Result type used by the enrichment router. */
export type EnrichContactResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export type EnrichPersonApolloParams = {
  email?: string;
  linkedinUrl?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
};

/**
 * Enrich one person via Apollo People Enrichment (POST /people/match).
 * Uses reveal_personal_emails=true to get email. Phone requires webhook so we don't request it here.
 */
export async function enrichPersonApollo(
  params: EnrichPersonApolloParams
): Promise<EnrichContactResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'APOLLO_API_KEY not set' };
  }

  const body: Record<string, string | boolean> = {
    reveal_personal_emails: true,
  };
  if (params.firstName) body.first_name = params.firstName;
  if (params.lastName) body.last_name = params.lastName;
  if (params.email) body.email = params.email;
  if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl;
  if (params.domain) body.domain = params.domain;
  if (params.organizationName) body.organization_name = params.organizationName;

  try {
    const res = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      const short = text.slice(0, 200);
      if (res.status === 401) {
        return { ok: false, error: `Apollo 401: ${short}` };
      }
      if (res.status === 403) {
        return { ok: false, error: `Apollo 403: ${short}` };
      }
      return { ok: false, error: `Apollo ${res.status}: ${short}` };
    }

    const data = (await res.json()) as {
      person?: { email?: string; title?: string };
      contact?: { email?: string; sanitized_phone?: string; phone_numbers?: Array<{ sanitized_number?: string }> };
    };
    const person = data.person ?? {};
    const contact = data.contact ?? {};
    const email = person.email ?? contact.email ?? undefined;
    const phone =
      contact.sanitized_phone ??
      contact.phone_numbers?.[0]?.sanitized_number ??
      undefined;
    const title = person.title ?? undefined;
    const verified = !!email;

    return {
      ok: true,
      data: {
        email: email ?? undefined,
        phone: phone ?? undefined,
        title: title ?? undefined,
        verified,
        enriched: true,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Apollo enrichment failed',
    };
  }
}
