'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DepartmentsTab } from '@/app/components/company/DepartmentsTab';
import { EngagementByBuyingGroup } from '@/app/components/company/EngagementByBuyingGroup';
import type { EngagementRow } from '@/app/components/company/EngagementByBuyingGroup';
import { AccountMessagingTab } from '@/app/components/company/AccountMessagingTab';
import { CampaignsTab, type CampaignItem } from '@/app/components/company/CampaignsTab';
import { CompanyResearchDisplay } from '@/app/components/company/CompanyResearchDisplay';
import { SalesforceBlock } from '@/app/components/company/SalesforceBlock';
import { CrawlStatus } from '@/app/components/company/CrawlStatus';
import { ContactsByBuyingGroup } from '@/app/components/company/ContactsByBuyingGroup';
import { ContentTab } from '@/app/components/company/ContentTab';
import { ActivityTimeline } from '@/app/components/company/ActivityTimeline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TabId = 'departments' | 'overview' | 'contacts' | 'content' | 'engagement' | 'activity' | 'messaging' | 'campaigns';

type AccountMessagingData = {
  id: string;
  whyThisCompany: string[] | null;
  useCases: unknown[] | null;
  successStories: unknown[] | null;
  objectionHandlers: unknown[] | null;
  doNotMention: unknown[] | null;
  aiGenerated: boolean;
  updatedAt: string;
} | null;

type ContentItem = { id: string; title: string; type: string };

type CompanyTabsProps = {
  companyId: string;
  companyName: string;
  companyData?: {
    industry: string | null;
    website: string | null;
    employees: string | null;
    headquarters: string | null;
    revenue: string | null;
    businessOverview: string | null;
    keyInitiatives: string[] | null;
    segmentationStrategy: string | null;
    segmentationRationale: string | null;
    salesforceLastSyncedAt: Date | null;
    salesforceOpportunityData: {
      opportunityName?: string;
      stage?: string;
      amount?: string;
      closeDate?: string;
      daysUntilClose?: number;
      lastActivityDate?: string;
    } | null;
    hasSalesforceAccess: boolean;
    lastCrawlAt: Date | null;
    nextCrawlAt: Date | null;
    lastContentChangeAt: Date | null;
  };
  departments: unknown[];
  matrixDepartments: unknown[];
  catalogProducts: unknown[];
  activities: Array<{ id: string; type: string; summary: string; createdAt: Date }>;
  contacts?: Array<{ id: string; firstName: string | null; lastName: string | null }>;
  contactCount: number;
  expansionStrategy: { phase1: string[]; phase2: string[]; phase3: string[] };
  accountMessaging: AccountMessagingData;
  contentLibraryUseCasesAndStories: ContentItem[];
  initialTab?: TabId;
  campaigns?: CampaignItem[];
  /** When this changes (e.g. after applying research), Overview refetches research data */
  researchDataKey?: string | number;
  /** Engagement metrics per buying group for Engagement tab */
  engagementByDept?: EngagementRow[];
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'departments', label: 'Buying Groups' },
  { id: 'overview', label: 'Overview' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'content', label: 'Content' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'activity', label: 'Activity' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'campaigns', label: 'Sales Page' },
];

export function CompanyTabs({
  companyId,
  companyName,
  departments,
  matrixDepartments,
  catalogProducts,
  activities,
  contactCount,
  expansionStrategy,
  accountMessaging,
  contentLibraryUseCasesAndStories,
  initialTab,
  campaigns = [],
  researchDataKey,
  engagementByDept = [],
}: CompanyTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'departments');

  useEffect(() => {
    if (initialTab === 'messaging') setActiveTab('messaging');
    if (initialTab === 'campaigns') setActiveTab('campaigns');
  }, [initialTab]);

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white dark:bg-zinc-800 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'departments' && (
        <div className="space-y-6">
          <DepartmentsTab
            companyId={companyId}
            departments={departments as Parameters<typeof DepartmentsTab>[0]['departments']}
            segmentationStrategy={companyData?.segmentationStrategy}
            segmentationRationale={companyData?.segmentationRationale}
          />
          <ExpansionStrategySection strategy={expansionStrategy} companyId={companyId} />
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Company Snapshot */}
          {companyData && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Company Snapshot</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {companyData.industry && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Industry:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{companyData.industry}</span>
                  </div>
                )}
                {companyData.revenue && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Revenue:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{companyData.revenue}</span>
                  </div>
                )}
                {companyData.employees && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Employees:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{companyData.employees}</span>
                  </div>
                )}
                {companyData.headquarters && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">HQ:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{companyData.headquarters}</span>
                  </div>
                )}
                {companyData.website && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Website:</span>{' '}
                    <a
                      href={companyData.website.startsWith('http') ? companyData.website : `https://${companyData.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {companyData.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Overview and Key Initiatives */}
          {companyData && (companyData.businessOverview || (companyData.keyInitiatives && companyData.keyInitiatives.length > 0)) && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Business Overview & Key Initiatives</h2>
              {companyData.businessOverview && (
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-300">{companyData.businessOverview}</p>
                </div>
              )}
              {companyData.keyInitiatives && companyData.keyInitiatives.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Key Initiatives</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                    {companyData.keyInitiatives.map((initiative, i) => (
                      <li key={i}>{initiative}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Salesforce Block */}
          {companyData && (
            <SalesforceBlock
              companyId={companyId}
              salesforceLastSyncedAt={companyData.salesforceLastSyncedAt}
              salesforceOpportunityData={companyData.salesforceOpportunityData}
              hasSalesforceAccess={companyData.hasSalesforceAccess}
            />
          )}

          {/* Crawl Status */}
          {companyData && (
            <CrawlStatus
              lastCrawlAt={companyData.lastCrawlAt}
              nextCrawlAt={companyData.nextCrawlAt}
              lastContentChangeAt={companyData.lastContentChangeAt}
            />
          )}

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account research</h2>
              <ResearchWithAIButton companyId={companyId} />
            </div>
            <CompanyResearchDisplay key={researchDataKey} companyId={companyId} />
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-zinc-600 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Work with expansion agent</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Chat with AI to find contacts, research the account, draft outreach (added to Approval queue), and track engagement.
                </p>
                <Link href={`/dashboard/companies/${companyId}?tab=messaging`}>
                  <Button>Open Messaging</Button>
                </Link>
              </div>
              <Link
                href={`/dashboard/companies/${companyId}/contacts`}
                className="block p-4 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Build contact list</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Find, add, and enrich contacts</p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <ContactsByBuyingGroup companyId={companyId} companyName={companyName} />
      )}

      {activeTab === 'content' && (
        <ContentTab
          companyId={companyId}
          companyName={companyName}
          departments={(departments as Array<{ id: string; customName: string | null; type: string }>).map((d) => ({
            id: d.id,
            customName: d.customName ?? null,
            type: d.type,
          }))}
        />
      )}

      {activeTab === 'engagement' && (
        <div id="engagement">
          <EngagementByBuyingGroup
            companyId={companyId}
            companyName={companyName}
            rows={engagementByDept}
          />
        </div>
      )}

      {activeTab === 'messaging' && (
        <AccountMessagingTab
          companyId={companyId}
          companyName={companyName}
          initialData={accountMessaging as React.ComponentProps<typeof AccountMessagingTab>['initialData']}
          contentLibrary={contentLibraryUseCasesAndStories}
        />
      )}

      {activeTab === 'campaigns' && (
        <CampaignsTab
          companyId={companyId}
          companyName={companyName}
          initialCampaigns={campaigns}
          departments={(departments as Array<{ id: string; customName: string | null; type: string }>).map((d) => ({
            id: d.id,
            customName: d.customName ?? null,
            type: d.type,
          }))}
          companyData={companyData ? {
            name: companyName,
            website: companyData.website,
            keyInitiatives: companyData.keyInitiatives,
          } : undefined}
        />

      {activeTab === 'activity' && (
        <ActivityTimeline
          companyId={companyId}
          initialActivities={activities}
          departments={(departments as Array<{ id: string; customName: string | null; type: string }>).map((d) => ({
            id: d.id,
            customName: d.customName ?? null,
            type: d.type,
          }))}
          contacts={contacts}
        />
      )}
    </div>
  );
}

function ResearchWithAIButton({ companyId }: { companyId: string }) {
  const [researching, setResearching] = useState(false);

  const handleResearch = async () => {
    setResearching(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/research`, {
        method: 'POST',
      });
      if (res.ok) {
        // Refresh the page to show updated research data
        window.location.reload();
      } else {
        alert('Failed to run research. Please try again.');
      }
    } catch (error) {
      console.error('Research error:', error);
      alert('Failed to run research. Please try again.');
    } finally {
      setResearching(false);
    }
  };

  return (
    <Button onClick={handleResearch} disabled={researching} size="sm">
      {researching ? 'Researching...' : 'Research with AI'}
    </Button>
  );
}

function ExpansionStrategySection({
  strategy,
  companyId,
}: {
  strategy: { phase1: string[]; phase2: string[]; phase3: string[] };
  companyId: string;
}) {
  const hasPhases = strategy.phase1.length > 0 || strategy.phase2.length > 0 || strategy.phase3.length > 0;
  if (!hasPhases) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Expansion Strategy Recommendation</h2>
      <div className="space-y-3 text-sm">
        {strategy.phase1.length > 0 && (
          <p>
            <span className="font-medium text-gray-700">Phase 1:</span> Focus on{' '}
            {strategy.phase1.join(', ')} (highest fit scores, budget signals detected).
          </p>
        )}
        {strategy.phase2.length > 0 && (
          <p>
            <span className="font-medium text-gray-700">Phase 2:</span> Upsell in {strategy.phase2.join(', ')}{' '}
            (leverage existing relationship).
          </p>
        )}
        {strategy.phase3.length > 0 && (
          <p>
            <span className="font-medium text-gray-700">Phase 3:</span> {strategy.phase3.join(', ')} (longer cycle or lower priority).
          </p>
        )}
      </div>
      <Link href={`/chat?play=expansion&accountId=${companyId}`} className="inline-block mt-4">
        <Button variant="outline">Chat with AI about strategy</Button>
      </Link>
    </div>
  );
}
