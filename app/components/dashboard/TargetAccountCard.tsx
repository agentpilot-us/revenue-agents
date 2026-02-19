'use client';

import Link from 'next/link';
import { CoverageIndicator } from './CoverageIndicator';
import { SalesforceOpportunityBadge } from './SalesforceOpportunityBadge';

type TargetAccountCardProps = {
  companyId: string;
  companyName: string;
  industry: string | null;
  arr: number | null;
  hasResearch: boolean;
  contactCount: number;
  hasCampaigns: boolean;
  hasEngagement: boolean;
  lastActivity?: Date | string | null;
  salesforceOpportunityData?: {
    opportunityName: string;
    stage: string;
    amount: number;
    closeDate: string | null;
    daysUntilClose: number | null;
    lastActivityDate: string | null;
  } | null;
  salesforceLastSyncedAt?: Date | string | null;
  salesforceAccountId?: string | null;
};

export function TargetAccountCard({
  companyId,
  companyName,
  industry,
  arr,
  hasResearch,
  contactCount,
  hasCampaigns,
  hasEngagement,
  lastActivity,
  salesforceOpportunityData,
  salesforceLastSyncedAt,
  salesforceAccountId,
}: TargetAccountCardProps) {
  const formatLastActivity = (date: Date | string | null | undefined): string => {
    if (!date) return 'No activity';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const formatARR = (arr: number | null): string => {
    if (!arr) return '';
    if (arr >= 1_000_000) return `$${(arr / 1_000_000).toFixed(1)}M ARR`;
    if (arr >= 1_000) return `$${(arr / 1_000).toFixed(0)}K ARR`;
    return `$${arr.toFixed(0)} ARR`;
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/companies/${companyId}`}
            className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
          >
            {companyName}
          </Link>
          
          <div className="flex items-center gap-2 mt-1">
            {industry && (
              <span className="text-sm text-gray-600 dark:text-gray-400">{industry}</span>
            )}
            {arr && (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatARR(arr)}
              </span>
            )}
          </div>

          {/* Coverage indicator */}
          <div className="mt-3">
            <CoverageIndicator
              research={hasResearch}
              contacts={contactCount > 0}
              pageLive={hasCampaigns}
              engaged={hasEngagement}
            />
          </div>

          {/* Salesforce opportunity data */}
          {salesforceOpportunityData && (
            <div className="mt-3">
              <SalesforceOpportunityBadge
                opportunityData={salesforceOpportunityData}
                lastSyncedAt={salesforceLastSyncedAt}
                companyId={companyId}
              />
            </div>
          )}
          
          {lastActivity && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
              Last activity: {formatLastActivity(lastActivity)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
