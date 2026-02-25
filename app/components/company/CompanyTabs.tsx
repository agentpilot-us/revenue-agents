'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DepartmentsTab } from '@/app/components/company/DepartmentsTab';
import { EngagementByBuyingGroup } from '@/app/components/company/EngagementByBuyingGroup';
import type { EngagementRow } from '@/app/components/company/EngagementByBuyingGroup';
import { AccountMessagingTab } from '@/app/components/company/AccountMessagingTab';
import { CampaignsTab, type CampaignItem } from '@/app/components/company/CampaignsTab';
import { SalesforceBlock } from '@/app/components/company/SalesforceBlock';
import { ContactsByBuyingGroup } from '@/app/components/company/ContactsByBuyingGroup';
import { ContentTab } from '@/app/components/company/ContentTab';
import { ActivityTimeline } from '@/app/components/company/ActivityTimeline';
import { NextStepBar } from '@/app/components/company/NextStepBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AccountMap } from '@/components/account/AccountMap';
import { ExpansionCanvas } from '@/components/account/ExpansionCanvas';
import { SignalDigest } from '@/app/components/company/SignalDigest';
import { useRouter } from 'next/navigation';

type TabId = 'departments' | 'overview' | 'contacts' | 'content' | 'engagement' | 'activity' | 'messaging' | 'campaigns' | 'map' | 'expansion';

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
    domain: string | null;
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
    accountIntelligenceCompletedAt: Date | null;
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
  /** Optional: called when user switches tab (e.g. for NextStepBar to show status) */
  onTabChange?: (tab: TabId) => void;
  /** When provided, show NextStepBar above tabs (guided flow) */
  nextStepBar?: {
    hasResearch: boolean;
    hasDepartments: boolean;
    hasMessaging: boolean;
    hasContacts: boolean;
    hasContent: boolean;
    hasCampaign: boolean;
    campaignUrl?: string | null;
  };
  /** When true, show only Get started card in Overview and filter to Overview tab only */
  setupIncomplete?: boolean;
  hasResearch?: boolean;
  hasDepartments?: boolean;
  hasContacts?: boolean;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'departments', label: 'Buying Groups' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'campaigns', label: 'Sales Page' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'activity', label: 'Activity' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'content', label: 'Content' },
  { id: 'expansion', label: 'Expansion' },
  { id: 'map', label: 'Account Map' },
];

export function CompanyTabs({
  companyId,
  companyName,
  companyData,
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
  onTabChange,
  nextStepBar,
  setupIncomplete = false,
  hasResearch = false,
  hasDepartments = false,
  hasContacts = false,
}: CompanyTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'overview');

  useEffect(() => {
    if (initialTab != null) setActiveTab(initialTab);
  }, [initialTab]);

  const setTab = (tabId: TabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className="space-y-4">
      {nextStepBar && (
        <NextStepBar
          companyId={companyId}
          companyName={companyName}
          currentTab={activeTab}
          hasResearch={nextStepBar.hasResearch}
          hasDepartments={nextStepBar.hasDepartments}
          hasMessaging={nextStepBar.hasMessaging}
          hasContacts={nextStepBar.hasContacts}
          hasContent={nextStepBar.hasContent}
          hasCampaign={nextStepBar.hasCampaign}
          campaignUrl={nextStepBar.campaignUrl}
        />
      )}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Tabs">
          {(setupIncomplete ? TABS.filter((t) => t.id === 'overview') : TABS).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
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
          {setupIncomplete ? (
            <GetStartedCard companyId={companyId} companyName={companyName} hasResearch={hasResearch} hasDepartments={hasDepartments} hasContacts={hasContacts} />
          ) : (
            <>
              {/* State 2: Company Snapshot */}
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

              {/* Research updated */}
              {companyData?.accountIntelligenceCompletedAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Research updated {new Date(companyData.accountIntelligenceCompletedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                </p>
              )}

              {/* Buying group coverage */}
              <BuyingGroupCoverageCard departments={departments} campaigns={campaigns} />

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
            </>
          )}
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
          hasMessaging={!!accountMessaging}
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
      )}

      {activeTab === 'activity' && (
        <SignalDigestTab companyId={companyId} companyName={companyName} />
      )}

      {activeTab === 'map' && (
        <AccountMapTab companyId={companyId} companyName={companyName} domain={companyData?.domain || undefined} />
      )}

      {activeTab === 'expansion' && (
        <ExpansionCanvasTab companyId={companyId} companyName={companyName} />
      )}
    </div>
  );
}

function GetStartedCard({
  companyId,
  companyName,
  hasResearch,
  hasDepartments,
  hasContacts,
}: {
  companyId: string;
  companyName: string;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasContacts: boolean;
}) {
  const intelligenceHref = `/dashboard/companies/${companyId}/intelligence`;
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Get started with {companyName}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        To use AgentPilot on this account you need:
      </p>
      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-6">
        <li className="flex items-center gap-2">
          {hasResearch ? <span className="text-green-600 dark:text-green-400" aria-hidden>✓</span> : <span className="text-gray-400" aria-hidden>○</span>}
          <span>Account research</span>
          {!hasResearch && (
            <Link href={intelligenceHref} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Research with AI →
            </Link>
          )}
        </li>
        <li className="flex items-center gap-2">
          {hasDepartments ? <span className="text-green-600 dark:text-green-400" aria-hidden>✓</span> : <span className="text-gray-400" aria-hidden>○</span>}
          At least one buying group
        </li>
        <li className="flex items-center gap-2">
          {hasContacts ? <span className="text-green-600 dark:text-green-400" aria-hidden>✓</span> : <span className="text-gray-400" aria-hidden>○</span>}
          Contacts in each group
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={intelligenceHref}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Complete account setup →
        </Link>
        <span className="text-xs text-gray-500 dark:text-gray-400">~5 minutes</span>
      </div>
    </div>
  );
}

function BuyingGroupCoverageCard({
  departments,
  campaigns,
}: {
  departments: unknown[];
  campaigns: Array<{ departmentId?: string | null }>;
}) {
  const depts = departments as Array<{ id: string; _count?: { contacts: number }; contacts?: unknown[] }>;
  const total = depts.length;
  const withContacts = total === 0 ? 0 : depts.filter((d) => ((d._count as { contacts?: number } | undefined)?.contacts ?? (Array.isArray(d.contacts) ? d.contacts.length : 0)) > 0).length;
  const deptIdsWithCampaigns = new Set(campaigns.map((c) => c.departmentId).filter(Boolean) as string[]);
  const withLivePages = deptIdsWithCampaigns.size;
  if (total === 0) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Buying group coverage</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {withContacts} of {total} groups have contacts; {withLivePages} have live pages.
      </p>
    </div>
  );
}

function AccountMapTab({ companyId, companyName, domain }: { companyId: string; companyName: string; domain?: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<{ account: { name: string; domain?: string }; microsegments: any[]; contacts: any[] } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/companies/${companyId}/account-map`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch account map data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading account map...</div>;
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">Failed to load account map data</div>;
  }

  return (
    <AccountMap
      accountName={data.account.name}
      domain={data.account.domain || domain}
      microsegments={data.microsegments}
      contacts={data.contacts}
      onOpenContactActivity={(contactId) => {
        router.push(`/dashboard/companies/${companyId}/contacts/${contactId}`);
      }}
      onOpenSegmentPage={(segmentId) => {
        router.push(`/dashboard/companies/${companyId}/segments/${segmentId}/page`);
      }}
      onOpenContactDiscovery={(segmentId) => {
        router.push(`/dashboard/companies/${companyId}/discover-contacts?departmentId=${segmentId}`);
      }}
    />
  );
}

function ExpansionCanvasTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<{ microsegments: any[] } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/companies/${companyId}/expansion-canvas`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch expansion canvas data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading expansion canvas...</div>;
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">Failed to load expansion canvas data</div>;
  }

  return (
    <ExpansionCanvas
      accountName={companyName}
      microsegments={data.microsegments}
      onCreateSegmentPage={(segmentId) => {
        router.push(`/dashboard/companies/${companyId}?tab=campaigns&departmentIds=${segmentId}`);
      }}
      onOpenSegmentPage={(segmentId, pageUrl) => {
        if (pageUrl) {
          window.open(pageUrl, '_blank');
        } else {
          router.push(`/dashboard/companies/${companyId}/segments/${segmentId}/page`);
        }
      }}
      onOpenEngagementPlay={(segmentId) => {
        router.push(`/dashboard/companies/${companyId}/segments/${segmentId}/engage`);
      }}
      onOpenChampionExpansion={(segmentId) => {
        // TODO: Open champion expansion modal
        router.push(`/chat?play=expansion&accountId=${companyId}&segmentId=${segmentId}`);
      }}
    />
  );
}

function SignalDigestTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  return <SignalDigest companyId={companyId} companyName={companyName} days={7} />;
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Where to focus first</h2>
      <div className="space-y-3 text-sm">
        {strategy.phase1.length > 0 && (
          <p>
            <span className="font-medium text-gray-700 dark:text-gray-300">Phase 1:</span> Focus on{' '}
            {strategy.phase1.join(', ')} (highest fit scores, budget signals detected).
          </p>
        )}
        {strategy.phase2.length > 0 && (
          <p>
            <span className="font-medium text-gray-700 dark:text-gray-300">Phase 2:</span> Upsell in {strategy.phase2.join(', ')}{' '}
            (leverage existing relationship).
          </p>
        )}
        {strategy.phase3.length > 0 && (
          <p>
            <span className="font-medium text-gray-700 dark:text-gray-300">Phase 3:</span> {strategy.phase3.join(', ')} (longer cycle or lower priority).
          </p>
        )}
      </div>
      <Link href={`/dashboard/companies/${companyId}/contacts`} className="inline-block mt-4">
        <Button>Find contacts for Phase 1 segments</Button>
      </Link>
    </div>
  );
}
