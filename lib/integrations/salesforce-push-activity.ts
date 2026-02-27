/**
 * Push activity (email, meeting) to Salesforce using the user's OAuth token.
 * Use this when the rep has connected Salesforce; contact/company may have salesforceId.
 * On 401, refreshes the token and retries once.
 */

import { getSalesforceAccessToken, getSalesforceInstanceUrl, refreshSalesforceToken } from './salesforce-oauth';

export type PushActivityParams = {
  userId: string;
  contactSalesforceId: string | null; // WhoId: Contact or Lead Id in Salesforce
  type: 'email' | 'meeting';
  subject?: string;
  body?: string;
  summary?: string;
  createdAt?: Date;
};

export type PushActivityResult = { ok: true } | { ok: false; error: string };

function buildTaskPayload(params: {
  contactSalesforceId: string;
  subject: string;
  body: string;
  createdAt: Date;
}): string {
  return JSON.stringify({
    WhoId: params.contactSalesforceId,
    Subject: params.subject,
    Description: params.body,
    ActivityDate: params.createdAt.toISOString().slice(0, 10),
    Status: 'Completed',
    Priority: 'Normal',
  });
}

/**
 * Create a Task in Salesforce for the given user's org.
 * Requires user to have connected Salesforce (salesforceAccessToken).
 * On 401 (expired/invalid token), refreshes and retries once.
 */
export async function pushActivityToSalesforceForUser(
  params: PushActivityParams
): Promise<PushActivityResult> {
  const { userId, contactSalesforceId, type, subject, body, summary, createdAt } = params;

  if (!contactSalesforceId) {
    return { ok: false, error: 'Contact not linked to Salesforce (no salesforceId)' };
  }

  const subj = subject ?? summary ?? (type === 'email' ? 'Email' : 'Meeting');
  const desc = body ?? summary ?? '';
  const created = createdAt ?? new Date();
  const taskBody = buildTaskPayload({
    contactSalesforceId,
    subject: subj,
    body: desc,
    createdAt: created,
  });

  try {
    let accessToken = await getSalesforceAccessToken(userId);
    const instanceUrl = await getSalesforceInstanceUrl(userId);
    const base = instanceUrl.replace(/\/$/, '');

    let res = await fetch(`${base}/services/data/v59.0/sobjects/Task`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: taskBody,
    });

    // 401: token expired or invalid — refresh and retry once
    if (res.status === 401) {
      try {
        accessToken = await refreshSalesforceToken(userId);
        res = await fetch(`${base}/services/data/v59.0/sobjects/Task`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: taskBody,
        });
      } catch (refreshErr) {
        const msg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
        return { ok: false, error: `Salesforce token refresh failed: ${msg}` };
      }
    }

    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Salesforce ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
