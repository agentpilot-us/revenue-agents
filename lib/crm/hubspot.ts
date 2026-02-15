import type { CrmContact, CrmAccount, CrmImportResult, CrmPushResult } from './types';

const HUBSPOT_API = 'https://api.hubapi.com';

function getHeaders(): HeadersInit {
  const key = process.env.HUBSPOT_API_KEY;
  if (!key) throw new Error('HUBSPOT_API_KEY is not set');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch HubSpot contacts. Optionally filter by company (association).
 */
export async function hubspotFetchContacts(options?: {
  companyId?: string;
  limit?: number;
}): Promise<{ contacts: CrmContact[]; companies: Map<string, CrmAccount> }> {
  const limit = options?.limit ?? 100;
  const contacts: CrmContact[] = [];
  const companies = new Map<string, CrmAccount>();

  const url = new URL(`${HUBSPOT_API}/crm/v3/objects/contacts`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('properties', 'email,firstname,lastname,jobtitle,phone,company');
  url.searchParams.set('associations', 'companies');

  const res = await fetch(url.toString(), { headers: getHeaders() });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HubSpot contacts: ${res.status} ${t}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      properties?: Record<string, string>;
      associations?: { companies?: { results?: Array<{ id: string }> } };
    }>;
  };
  const results = data.results ?? [];

  const filterByCompanyId = options?.companyId ?? null;

  for (const r of results) {
    const props = r.properties ?? {};
    const assocCompanyIds = r.associations?.companies?.results?.map((x) => x.id) ?? [];
    let companyId = props.company ?? assocCompanyIds[0] ?? null;
    if (filterByCompanyId && assocCompanyIds.includes(filterByCompanyId)) {
      companyId = filterByCompanyId;
    }
    contacts.push({
      id: r.id,
      email: props.email ?? null,
      firstName: props.firstname ?? null,
      lastName: props.lastname ?? null,
      title: props.jobtitle ?? null,
      phone: props.phone ?? null,
      companyId,
      companyName: null,
    });
  }

  if (filterByCompanyId) {
    const filtered = contacts.filter((c) => c.companyId === filterByCompanyId);
    return { contacts: filtered, companies };
  }

  const companyIds = [...new Set(contacts.map((c) => c.companyId).filter(Boolean))] as string[];
  for (const cid of companyIds.slice(0, 50)) {
    try {
      const cr = await fetch(`${HUBSPOT_API}/crm/v3/objects/companies/${cid}?properties=name,domain,website`, {
        headers: getHeaders(),
      });
      if (cr.ok) {
        const j = (await cr.json()) as { properties?: Record<string, string> };
        const p = j.properties ?? {};
        companies.set(cid, {
          id: cid,
          name: p.name ?? '',
          domain: p.domain ?? null,
          website: p.website ?? null,
        });
      }
    } catch {
      // skip
    }
  }

  for (const c of contacts) {
    if (c.companyId && companies.has(c.companyId)) {
      c.companyName = companies.get(c.companyId)!.name;
    }
  }

  return { contacts, companies };
}

/**
 * Push an activity (email or meeting) to HubSpot as an engagement.
 */
export async function hubspotPushActivity(params: {
  contactId: string; // HubSpot contact id
  type: 'email' | 'meeting';
  subject?: string;
  body?: string;
  summary?: string;
  createdAt?: Date;
}): Promise<{ ok: boolean; error?: string }> {
  const { contactId, type, subject, body, summary, createdAt } = params;
  try {
    if (type === 'email') {
      const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/emails`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          properties: {
            hs_timestamp: (createdAt ?? new Date()).toISOString(),
            hs_email_subject: subject ?? summary ?? 'Email',
            hs_email_text: body ?? summary ?? '',
          },
          associations: [
            { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 198 }] },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status} ${t}` };
      }
      return { ok: true };
    }

    if (type === 'meeting') {
      const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/meetings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          properties: {
            hs_timestamp: (createdAt ?? new Date()).toISOString(),
            hs_meeting_title: subject ?? summary ?? 'Meeting',
            hs_meeting_body: body ?? summary ?? '',
          },
          associations: [
            { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `${res.status} ${t}` };
      }
      return { ok: true };
    }

    return { ok: false, error: 'Unsupported type' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function isHubSpotConfigured(): boolean {
  return !!process.env.HUBSPOT_API_KEY;
}
