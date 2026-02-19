import { getSalesforceAccessToken, getSalesforceInstanceUrl } from './salesforce-oauth';

export type SalesforceOpportunityData = {
  opportunityName: string;
  stage: string;
  amount: number;
  closeDate: string | null;
  daysUntilClose: number | null;
  lastActivityDate: string | null;
};

export async function fetchSalesforceOpportunityData(
  userId: string,
  salesforceAccountId: string
): Promise<SalesforceOpportunityData | null> {
  try {
    const accessToken = await getSalesforceAccessToken(userId);
    const instanceUrl = await getSalesforceInstanceUrl(userId);

    // Query 1: Get Account name (verify account exists)
    const accountQuery = `SELECT Id, Name FROM Account WHERE Id = '${salesforceAccountId}' LIMIT 1`;
    const accountRes = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(accountQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!accountRes.ok) {
      throw new Error(`Account query failed: ${accountRes.status}`);
    }

    const accountData = await accountRes.json();
    if (!accountData.records || accountData.records.length === 0) {
      return null; // Account not found
    }

    // Query 2: Get open Opportunities (ordered by Amount DESC)
    const opportunityQuery = `SELECT Id, Name, StageName, Amount, CloseDate FROM Opportunity WHERE AccountId = '${salesforceAccountId}' AND IsClosed = false ORDER BY Amount DESC NULLS LAST LIMIT 1`;
    const oppRes = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(opportunityQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let opportunity = null;
    if (oppRes.ok) {
      const oppData = await oppRes.json();
      if (oppData.records && oppData.records.length > 0) {
        opportunity = oppData.records[0];
      }
    }

    // Query 3: Get most recent Activity
    const activityQuery = `SELECT Id, ActivityDate, LastModifiedDate FROM Task WHERE WhatId = '${salesforceAccountId}' OR AccountId = '${salesforceAccountId}' ORDER BY LastModifiedDate DESC LIMIT 1`;
    const activityRes = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(activityQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let lastActivityDate: string | null = null;
    if (activityRes.ok) {
      const activityData = await activityRes.json();
      if (activityData.records && activityData.records.length > 0) {
        const activity = activityData.records[0];
        lastActivityDate = activity.LastModifiedDate || activity.ActivityDate || null;
      }
    }

    if (!opportunity) {
      return null; // No open opportunity
    }

    // Calculate days until close
    let daysUntilClose: number | null = null;
    if (opportunity.CloseDate) {
      const closeDate = new Date(opportunity.CloseDate);
      const now = new Date();
      const diffMs = closeDate.getTime() - now.getTime();
      daysUntilClose = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      opportunityName: opportunity.Name || '',
      stage: opportunity.StageName || '',
      amount: opportunity.Amount || 0,
      closeDate: opportunity.CloseDate || null,
      daysUntilClose,
      lastActivityDate,
    };
  } catch (error) {
    console.error('Salesforce opportunity fetch error:', error);
    throw error;
  }
}
