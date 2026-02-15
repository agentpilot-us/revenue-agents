import type { CrmContact, CrmAccount, CrmPushResult } from './types';

function getConfig(): { accessToken: string; instanceUrl: string } {
  const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL ?? process.env.SALESFORCE_BASE_URL;
  if (!accessToken || !instanceUrl) {
    throw new Error('SALESFORCE_ACCESS_TOKEN and SALESFORCE_INSTANCE_URL (or SALESFORCE_BASE_URL) must be set');
  }
  const base = instanceUrl.replace(/\/$/, '');
  return { accessToken, instanceUrl: base };
}

function sfFetch(path: string, options?: RequestInit): Promise<Response> {
  const { accessToken, instanceUrl } = getConfig();
  return fetch(`${instanceUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/** Optional Salesforce custom field API names for segment/buying group (e.g. AgentPilot_Segment__c) */
function getSalesforceSegmentFieldNames(): { contactField?: string; accountField?: string } {
  const contactField = process.env.SALESFORCE_CONTACT_SEGMENT_FIELD?.trim() || undefined;
  const accountField = process.env.SALESFORCE_ACCOUNT_SEGMENT_FIELD?.trim() || undefined;
  return { contactField, accountField };
}

/**
 * Fetch Salesforce contacts for an Account (or all contacts if no accountId).
 * When SALESFORCE_CONTACT_SEGMENT_FIELD (and optionally SALESFORCE_ACCOUNT_SEGMENT_FIELD) are set,
 * includes those custom fields so we can map contacts to CompanyDepartment on import.
 */
export async function salesforceFetchContacts(options?: {
  accountId?: string;
  limit?: number;
}): Promise<{ contacts: CrmContact[]; accounts: Map<string, CrmAccount> }> {
  const limit = Math.min(options?.limit ?? 200, 200);
  const accounts = new Map<string, CrmAccount>();
  const { contactField, accountField } = getSalesforceSegmentFieldNames();

  const contactSelect = [
    'Id', 'Email', 'FirstName', 'LastName', 'Title', 'Phone', 'AccountId',
    'Account.Name', 'Account.Website',
    ...(contactField ? [contactField] : []),
    ...(accountField ? [`Account.${accountField}`] : []),
  ].join(', ');

  let query: string;
  if (options?.accountId) {
    query = `SELECT ${contactSelect} FROM Contact WHERE AccountId = '${options.accountId}' LIMIT ${limit}`;
  } else {
    query = `SELECT ${contactSelect} FROM Contact LIMIT ${limit}`;
  }

  const res = await sfFetch(`/services/data/v59.0/query?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Salesforce query: ${res.status} ${t}`);
  }

  type RecordShape = {
    Id: string;
    Email?: string;
    FirstName?: string;
    LastName?: string;
    Title?: string;
    Phone?: string;
    AccountId?: string;
    Account?: { Name?: string; Website?: string; [k: string]: unknown };
    [k: string]: unknown;
  };

  const data = (await res.json()) as { records?: RecordShape[] };

  const contacts: CrmContact[] = (data.records ?? []).map((r) => {
    const acc = r.Account;
    if (r.AccountId && acc) {
      const accountSegment = accountField && acc[accountField] != null ? String(acc[accountField]) : null;
      accounts.set(r.AccountId, {
        id: r.AccountId,
        name: acc.Name ?? '',
        website: acc.Website ?? null,
        domain: acc.Website ? new URL(acc.Website).hostname.replace(/^www\./, '') : null,
        segmentName: accountSegment ?? undefined,
      });
    }
    const contactSegment = contactField && r[contactField] != null ? String(r[contactField]) : null;
    const accountSegmentForContact = r.AccountId ? accounts.get(r.AccountId)?.segmentName ?? null : null;
    const segmentName = (contactSegment ?? accountSegmentForContact ?? null) || undefined;

    return {
      id: r.Id,
      email: r.Email ?? null,
      firstName: r.FirstName ?? null,
      lastName: r.LastName ?? null,
      title: r.Title ?? null,
      phone: r.Phone ?? null,
      companyId: r.AccountId ?? null,
      companyName: r.Account?.Name ?? null,
      segmentName: segmentName ?? undefined,
    };
  });

  return { contacts, accounts };
}

/**
 * Push an activity (email or meeting) to Salesforce as a Task.
 */
export async function salesforcePushActivity(params: {
  contactId: string; // Salesforce Contact Id
  type: 'email' | 'meeting';
  subject?: string;
  body?: string;
  summary?: string;
  createdAt?: Date;
}): Promise<{ ok: boolean; error?: string }> {
  const { contactId, type, subject, body, summary, createdAt } = params;
  const subj = subject ?? summary ?? (type === 'email' ? 'Email' : 'Meeting');
  const desc = body ?? summary ?? '';

  try {
    const res = await sfFetch('/services/data/v59.0/sobjects/Task', {
      method: 'POST',
      body: JSON.stringify({
        WhoId: contactId,
        Subject: subj,
        Description: desc,
        ActivityDate: (createdAt ?? new Date()).toISOString().slice(0, 10),
        Status: 'Completed',
        Priority: 'Normal',
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `${res.status} ${t}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Push segment/buying group data to Salesforce Account and Contact custom fields.
 * Requires SALESFORCE_ACCOUNT_SEGMENT_FIELD and/or SALESFORCE_CONTACT_SEGMENT_FIELD to be set.
 */
export async function salesforcePushSegmentUpdates(params: {
  salesforceAccountId: string;
  accountSegmentValue: string | null;
  contacts: Array<{ salesforceId: string; segmentValue: string | null }>;
}): Promise<{ ok: boolean; updated: number; errors: string[] }> {
  const { contactField, accountField } = getSalesforceSegmentFieldNames();
  if (!contactField && !accountField) {
    return { ok: true, updated: 0, errors: ['No segment fields configured (SALESFORCE_ACCOUNT_SEGMENT_FIELD / SALESFORCE_CONTACT_SEGMENT_FIELD)'] };
  }
  const errors: string[] = [];
  let updated = 0;

  if (accountField && params.accountSegmentValue != null && params.accountSegmentValue !== '') {
    try {
      const res = await sfFetch(
        `/services/data/v59.0/sobjects/Account/${params.salesforceAccountId}`,
        { method: 'PATCH', body: JSON.stringify({ [accountField]: params.accountSegmentValue }) }
      );
      if (res.ok) updated++;
      else errors.push(`Account: ${res.status} ${await res.text()}`);
    } catch (e) {
      errors.push(`Account: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const c of params.contacts) {
    if (!contactField) break;
    if (c.segmentValue == null || c.segmentValue === '') continue;
    try {
      const res = await sfFetch(
        `/services/data/v59.0/sobjects/Contact/${c.salesforceId}`,
        { method: 'PATCH', body: JSON.stringify({ [contactField]: c.segmentValue }) }
      );
      if (res.ok) updated++;
      else errors.push(`Contact ${c.salesforceId}: ${res.status} ${await res.text()}`);
    } catch (e) {
      errors.push(`Contact ${c.salesforceId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { ok: errors.length === 0, updated, errors };
}

export function isSalesforceConfigured(): boolean {
  return !!(process.env.SALESFORCE_ACCESS_TOKEN && (process.env.SALESFORCE_INSTANCE_URL || process.env.SALESFORCE_BASE_URL));
}

/**
 * Create a Lead in Salesforce (e.g. from a campaign landing page).
 * Used by nightly campaign-leads push.
 */
export async function salesforceCreateLead(params: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  description?: string | null;
}): Promise<{ ok: boolean; leadId?: string; error?: string }> {
  const { email, firstName, lastName, company, description } = params;
  const lastNameVal = (lastName ?? firstName ?? email).trim() || 'Unknown';
  const firstNameVal = (firstName ?? '').trim() || null;

  try {
    const body: Record<string, unknown> = {
      Email: email,
      LastName: lastNameVal,
      ...(firstNameVal ? { FirstName: firstNameVal } : {}),
      ...(company?.trim() ? { Company: company.trim() } : {}),
      ...(description?.trim() ? { Description: description.trim() } : {}),
    };
    const res = await sfFetch('/services/data/v59.0/sobjects/Lead', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `${res.status} ${t}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, leadId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
