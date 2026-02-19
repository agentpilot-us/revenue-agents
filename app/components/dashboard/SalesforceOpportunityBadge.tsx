'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  opportunityData: {
    opportunityName: string;
    stage: string;
    amount: number;
    closeDate: string | null;
    daysUntilClose: number | null;
    lastActivityDate: string | null;
  };
  lastSyncedAt?: Date | string | null;
  companyId?: string;
};

export function SalesforceOpportunityBadge({ opportunityData, lastSyncedAt, companyId }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const formatAmount = (amount: number): string => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatLastSynced = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours === 0) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const handleSync = async () => {
    if (!companyId || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/salesforce/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const parts: string[] = [];
  if (opportunityData.amount) {
    parts.push(formatAmount(opportunityData.amount));
  }
  if (opportunityData.opportunityName) {
    parts.push(opportunityData.opportunityName);
  }
  if (opportunityData.stage) {
    parts.push(opportunityData.stage);
  }
  if (opportunityData.daysUntilClose !== null) {
    parts.push(`${opportunityData.daysUntilClose} days`);
  }

  const opportunityText = parts.join(' — ');

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {opportunityText}
      </div>
      <div className="flex items-center gap-2">
        {lastSyncedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last synced: {formatLastSynced(lastSyncedAt)}
          </p>
        )}
        {companyId && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            title="Refresh Salesforce data"
          >
            {syncing ? 'Syncing...' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}
