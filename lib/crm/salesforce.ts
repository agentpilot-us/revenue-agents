import type { CrmContact, CrmAccount, CrmPushResult } from './types';
import { prisma } from '@/lib/db';
import { refreshSalesforceToken } from '@/lib/integrations/salesforce-oauth';

async function getConfig(userId?: string): Promise<{ accessToken: string; instanceUrl: string }> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        salesforceAccessToken: true,
        salesforceInstanceUrl: true,
        salesforceTokenExpiresAt: true,
      },
    });

    if (user?.salesforceAccessToken && user?.salesforceInstanceUrl) {
      let accessToken = user.salesforceAccessToken;

      // Refresh if expired or expiring within 5 minutes
      if (
        user.salesforceTokenExpiresAt &&
        user.salesforceTokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000
      ) {
        accessToken = await refreshSalesforceToken(userId);
      }

      return {
        accessToken,
        instanceUrl: user.salesforceInstanceUrl.replace(/\/$/, ''),
      };
    }
  }

  const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL ?? process.env.SALESFORCE_BASE_URL;
  if (!accessToken || !instanceUrl) {
    throw new Error('SALESFORCE_ACCESS_TOKEN and SALESFORCE_INSTANCE_URL (or SALESFORCE_BASE_URL) must be set');
  }
  const base = instanceUrl.replace(/\/$/, '');
  return { accessToken, instanceUrl: base };
}

async function sfFetch(path: string, options?: RequestInit, userId?: string): Promise<Response> {
  const { accessToken, instanceUrl } = await getConfig(userId);
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
  userId?: string;
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

  const res = await sfFetch(`/services/data/v59.0/query?q=${encodeURIComponent(query)}`, undefined, options?.userId);
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
  userId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { contactId, type, subject, body, summary, createdAt, userId } = params;
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
    }, userId);

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
  userId?: string;
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
        { method: 'PATCH', body: JSON.stringify({ [accountField]: params.accountSegmentValue }) },
        params.userId
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
        { method: 'PATCH', body: JSON.stringify({ [contactField]: c.segmentValue }) },
        params.userId
      );
      if (res.ok) updated++;
      else errors.push(`Contact ${c.salesforceId}: ${res.status} ${await res.text()}`);
    } catch (e) {
      errors.push(`Contact ${c.salesforceId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { ok: errors.length === 0, updated, errors };
}

/**
 * Search Salesforce Accounts by name. Returns up to 50 results.
 */
export async function salesforceFetchAccounts(search?: string, userId?: string): Promise<Array<{
  salesforceId: string;
  name: string;
  website: string | null;
  industry: string | null;
}>> {
  let query = 'SELECT Id, Name, Website, Industry FROM Account';
  if (search?.trim()) {
    const escaped = search.trim().replace(/'/g, "\\'");
    query += ` WHERE Name LIKE '%${escaped}%'`;
  }
  query += ' ORDER BY Name ASC LIMIT 50';

  const res = await sfFetch(`/services/data/v59.0/query?q=${encodeURIComponent(query)}`, undefined, userId);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Salesforce query: ${res.status} ${t}`);
  }

  type AccountRecord = { Id: string; Name: string; Website?: string; Industry?: string };
  const data = (await res.json()) as { records?: AccountRecord[] };
  return (data.records ?? []).map((r) => ({
    salesforceId: r.Id,
    name: r.Name,
    website: r.Website ?? null,
    industry: r.Industry ?? null,
  }));
}

/**
 * Fetch a single Salesforce Account by Id.
 */
export async function salesforceFetchAccountById(accountId: string, userId?: string): Promise<{
  salesforceId: string;
  name: string;
  website: string | null;
  industry: string | null;
} | null> {
  const escaped = accountId.replace(/'/g, "\\'");
  const query = `SELECT Id, Name, Website, Industry FROM Account WHERE Id = '${escaped}' LIMIT 1`;
  const res = await sfFetch(`/services/data/v59.0/query?q=${encodeURIComponent(query)}`, undefined, userId);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Salesforce query: ${res.status} ${t}`);
  }

  type AccountRecord = { Id: string; Name: string; Website?: string; Industry?: string };
  const data = (await res.json()) as { records?: AccountRecord[] };
  const record = data.records?.[0];
  if (!record) return null;
  return {
    salesforceId: record.Id,
    name: record.Name,
    website: record.Website ?? null,
    industry: record.Industry ?? null,
  };
}

export async function isSalesforceConfigured(userId?: string): Promise<boolean> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { salesforceAccessToken: true, salesforceInstanceUrl: true },
    });
    if (user?.salesforceAccessToken && user?.salesforceInstanceUrl) return true;
  }
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
  userId?: string;
}): Promise<{ ok: boolean; leadId?: string; error?: string }> {
  const { email, firstName, lastName, company, description, userId } = params;
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
    }, userId);

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
