'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DepartmentsTab } from '@/app/components/company/DepartmentsTab';
import { ProductPenetrationMatrix } from '@/app/components/company/ProductPenetrationMatrix';
import { AccountMessagingTab } from '@/app/components/company/AccountMessagingTab';
import { CampaignsTab, type CampaignItem } from '@/app/components/company/CampaignsTab';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TabId = 'departments' | 'overview' | 'contacts' | 'products' | 'activity' | 'messaging' | 'campaigns';

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

type PipelineByMicrosegment = Array<{ departmentId: string; departmentName: string; pipelineValue: number }>;
type Funnel = { contacted: number; engaged: number; meetings: number; opportunity: number };

type CompanyTabsProps = {
  companyId: string;
  companyName: string;
  departments: unknown[];
  matrixDepartments: unknown[];
  catalogProducts: unknown[];
  activities: Array<{ id: string; type: string; summary: string; createdAt: Date }>;
  contactCount: number;
  expansionStrategy: { phase1: string[]; phase2: string[]; phase3: string[] };
  accountMessaging: AccountMessagingData;
  contentLibraryUseCasesAndStories: ContentItem[];
  initialTab?: TabId;
  pipelineByMicrosegment?: PipelineByMicrosegment;
  funnel?: Funnel;
  campaigns?: CampaignItem[];
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'departments', label: 'Departments' },
  { id: 'overview', label: 'Overview' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'products', label: 'Products' },
  { id: 'activity', label: 'Activity' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'campaigns', label: 'Campaigns' },
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
  pipelineByMicrosegment = [],
  funnel,
  campaigns = [],
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
          <DepartmentsTab companyId={companyId} departments={departments as Parameters<typeof DepartmentsTab>[0]['departments']} />
          <ExpansionStrategySection strategy={expansionStrategy} companyId={companyId} />
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {(pipelineByMicrosegment.length > 0 || funnel) && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Pipeline &amp; funnel</h2>
              {funnel != null && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funnel</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="rounded border border-gray-200 dark:border-zinc-600 px-4 py-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{funnel.contacted}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Contacted</span>
                    </div>
                    <div className="rounded border border-gray-200 dark:border-zinc-600 px-4 py-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{funnel.engaged}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Engaged</span>
                    </div>
                    <div className="rounded border border-gray-200 dark:border-zinc-600 px-4 py-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{funnel.meetings}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Meetings</span>
                    </div>
                    <div className="rounded border border-amber-200 dark:border-amber-800 px-4 py-2">
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        ${(funnel.opportunity / 1000).toFixed(0)}K
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Pipeline</span>
                    </div>
                  </div>
                </div>
              )}
              {pipelineByMicrosegment.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Pipeline by microsegment</p>
                  <ul className="space-y-2">
                    {pipelineByMicrosegment.map((p) => (
                      <li key={p.departmentId} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-zinc-700 last:border-0">
                        <Link
                          href={`/dashboard/companies/${companyId}/departments/${p.departmentId}`}
                          className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {p.departmentName}
                        </Link>
                        <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                          ${(p.pipelineValue / 1000).toFixed(0)}K
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contacts</h2>
          <p className="text-gray-600 mb-4">
            {contactCount} contact{contactCount !== 1 ? 's' : ''} at {companyName}
          </p>
          <Link href={`/dashboard/companies/${companyId}/contacts`}>
            <Button>View all contacts</Button>
          </Link>
        </div>
      )}

      {activeTab === 'products' && (
        <div id="products">
        <ProductPenetrationMatrix
          data={{
            companyId,
            departments: matrixDepartments as Parameters<typeof ProductPenetrationMatrix>[0]['data']['departments'],
            products: catalogProducts as Parameters<typeof ProductPenetrationMatrix>[0]['data']['products'],
          }}
        />
        </div>
      )}

      {activeTab === 'messaging' && (
        <AccountMessagingTab
          companyId={companyId}
          companyName={companyName}
          initialData={accountMessaging}
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
        />
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow divide-y dark:divide-zinc-700">
            <h2 className="text-xl font-semibold text-gray-900 p-4">Recent Agent Activity</h2>
            {activities.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No activity yet. Launch a play to get started.</div>
            ) : (
              activities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {activity.type === 'EMAIL_SENT' || activity.type === 'Email' ? '📧' :
                        activity.type === 'Research' ? '🔍' :
                          activity.type === 'ContactDiscovered' ? '👥' : '📝'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{activity.summary}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Engagement Summary</h2>
            <ul className="space-y-2 text-gray-700">
              <li>{contactCount} total contacts</li>
              <li>{activities.filter((a) => a.type === 'EMAIL_SENT' || a.type === 'Email').length} emails sent</li>
              <li>{activities.filter((a) => a.type === 'EMAIL_REPLIED' || a.type === 'EmailReply').length} replies received</li>
            </ul>
          </div>
        </div>
      )}
    </div>
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
