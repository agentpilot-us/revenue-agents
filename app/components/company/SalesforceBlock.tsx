'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type SalesforceOpportunityData = {
  opportunityName?: string;
  stage?: string;
  amount?: string;
  closeDate?: string;
  daysUntilClose?: number;
  lastActivityDate?: string;
} | null;

type Props = {
  companyId: string;
  salesforceLastSyncedAt: Date | null;
  salesforceOpportunityData: SalesforceOpportunityData;
  hasSalesforceAccess: boolean;
};

export function SalesforceBlock({
  companyId,
  salesforceLastSyncedAt,
  salesforceOpportunityData,
  hasSalesforceAccess,
}: Props) {
  const [accountOwner, setAccountOwner] = useState<string | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);

  useEffect(() => {
    if (hasSalesforceAccess && salesforceLastSyncedAt) {
      setLoadingOwner(true);
      fetch(`/api/companies/${companyId}/salesforce/account-owner`)
        .then((res) => res.json())
        .then((data) => {
          if (data.owner) {
            setAccountOwner(data.owner);
          }
        })
        .catch(() => {
          // Silently fail - owner is optional
        })
        .finally(() => {
          setLoadingOwner(false);
        });
    }
  }, [companyId, hasSalesforceAccess, salesforceLastSyncedAt]);

  if (!hasSalesforceAccess) {
    return null;
  }

  const hasOpportunityData = salesforceOpportunityData && (
    salesforceOpportunityData.opportunityName ||
    salesforceOpportunityData.stage ||
    salesforceOpportunityData.amount
  );

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Salesforce</h2>
        {salesforceLastSyncedAt && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last synced: {new Date(salesforceLastSyncedAt).toLocaleString()}
          </span>
        )}
      </div>

      {hasOpportunityData && (
        <div className="space-y-3 mb-4">
          {salesforceOpportunityData.opportunityName && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Opportunity:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">{salesforceOpportunityData.opportunityName}</span>
            </div>
          )}
          {salesforceOpportunityData.stage && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Stage:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">{salesforceOpportunityData.stage}</span>
            </div>
          )}
          {salesforceOpportunityData.amount && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Amount:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">{salesforceOpportunityData.amount}</span>
            </div>
          )}
          {salesforceOpportunityData.daysUntilClose !== undefined && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Days until close:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">{salesforceOpportunityData.daysUntilClose}</span>
            </div>
          )}
          {salesforceOpportunityData.lastActivityDate && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Last activity:</span>{' '}
              <span className="text-gray-600 dark:text-gray-400">
                {new Date(salesforceOpportunityData.lastActivityDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      {accountOwner && (
        <div className="mb-4">
          <span className="font-medium text-gray-700 dark:text-gray-300">Account Executive:</span>{' '}
          <span className="text-gray-600 dark:text-gray-400">{accountOwner}</span>
        </div>
      )}

      {loadingOwner && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading account owner...</div>
      )}

      {!hasOpportunityData && !accountOwner && !loadingOwner && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No Salesforce data available.</p>
      )}
    </div>
  );
}
