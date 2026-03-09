'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { DepartmentsTab } from '@/app/components/company/DepartmentsTab';
import { PrepMePanel, type PrepMePanelParams } from '@/app/components/company/PrepMePanel';
import type { EngagementRow } from '@/app/components/company/EngagementByBuyingGroup';
import type { CampaignItem } from '@/app/components/company/CampaignsTab';
import { SalesforceBlock } from '@/app/components/company/SalesforceBlock';
import { ContactsByBuyingGroup } from '@/app/components/company/ContactsByBuyingGroup';
import { ContentTabV2 as ContentTab } from '@/app/components/company/ContentTabV2';
import { NextStepBar } from '@/app/components/company/NextStepBar';
import { cn } from '@/lib/utils';
import { ExistingStackEditor } from '@/app/components/company/ExistingStackEditor';
import { ActiveObjectionsPanel } from '@/app/components/company/ActiveObjectionsPanel';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
type TabId = 'overview' | 'buying-groups' | 'contacts' | 'content';

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
    dealObjective: string | null;
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
  /** Case studies for Division Intelligence Cards (Buying Groups tab). */
  caseStudies?: Array<{ title: string; oneLiner: string; industry: string | null; department: string | null }>;
  activities: Array<{ id: string; type: string; summary: string; createdAt: Date }>;
  contacts?: Array<{ id: string; firstName: string | null; lastName: string | null }>;
  contactCount: number;
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
  signalCount?: number;
  /** URL context from searchParams for deep-links (Spec 1): division, type, signal, contact, action, contactName, contentFilter */
  urlContext?: {
    division?: string;
    type?: string;
    signal?: string;
    contact?: string;
    action?: string;
    contactName?: string;
    contentFilter?: string;
  };
  /** When set (e.g. from dashboard Prep Me link), open Prep Me panel on mount with signal context */
  prepMeFromUrl?: { signalTitle?: string; signalSummary?: string; divisionName?: string } | null;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'buying-groups', label: 'Buying Groups' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'content', label: 'Content' },
];

function DealObjectiveBar({
  companyId,
  initialValue,
}: {
  companyId: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const save = async () => {
    if (isSaving) return;
    setIsEditing(false);
    const toSave = value.trim();
    if (toSave === (initialValue ?? '')) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealObjective: toSave || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch {
      setValue(initialValue ?? '');
    } finally {
      setIsSaving(false);
    }
  };

  const displayText = value.trim() || null;
  const placeholder = 'Set deal objective...';

  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground py-1"
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <Target className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') {
              setValue(initialValue ?? '');
              setIsEditing(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent border-b border-border focus:outline-none focus:border-blue-500 py-0.5 text-card-foreground placeholder:text-muted-foreground"
        />
      ) : (
        <span
          className={cn(
            'flex-1 min-w-0 cursor-text hover:text-muted-foreground transition-colors',
            !displayText && 'italic'
          )}
        >
          {displayText ?? placeholder}
        </span>
      )}
      {isSaving && (
        <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>
      )}
    </div>
  );
}

export function CompanyTabs({
  companyId,
  companyName,
  companyData,
  departments,
  matrixDepartments,
  catalogProducts,
  caseStudies = [],
  activities,
  contactCount,
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
  signalCount = 0,
  urlContext,
  prepMeFromUrl,
}: CompanyTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'overview');
  const selectedDivision = urlContext?.division ?? null;
  const [prepMeOpen, setPrepMeOpen] = useState(false);
  const [prepMeParams, setPrepMeParams] = useState<PrepMePanelParams | null>(null);
  const prepMeFromUrlOpened = useRef(false);

  const openPrepMe = (params: PrepMePanelParams) => {
    setPrepMeParams(params);
    setPrepMeOpen(true);
  };

  useEffect(() => {
    if (initialTab != null) setActiveTab(initialTab);
  }, [initialTab]);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (!prepMeFromUrl) {
      prepMeFromUrlOpened.current = false;
      return;
    }
    if (prepMeFromUrlOpened.current || !companyId || !companyName) return;
    prepMeFromUrlOpened.current = true;
    setPrepMeParams({
      companyId,
      companyName,
      divisionName: prepMeFromUrl.divisionName,
      signalTitle: prepMeFromUrl.signalTitle,
      signalSummary: prepMeFromUrl.signalSummary,
    });
    setPrepMeOpen(true);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('prepMe');
    params.delete('signalTitle');
    params.delete('signalSummary');
    params.delete('divisionName');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [prepMeFromUrl, companyId, companyName, pathname, router]);

  const setTab = (tabId: TabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
    const params = new URLSearchParams();
    params.set('tab', tabId);
    if (selectedDivision) params.set('division', selectedDivision);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <DealObjectiveBar
        companyId={companyId}
        initialValue={companyData?.dealObjective ?? null}
      />
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
      <div className="border-b border-border">
        <nav className="flex gap-1" aria-label="Tabs">
          {(setupIncomplete ? TABS.filter((t) => t.id === 'overview') : TABS).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-card dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'buying-groups' && (
        <DepartmentsTab
          companyId={companyId}
          companyName={companyName}
          departments={departments as Parameters<typeof DepartmentsTab>[0]['departments']}
          segmentationStrategy={companyData?.segmentationStrategy}
          segmentationRationale={companyData?.segmentationRationale}
          caseStudies={caseStudies}
          onPrepMeOpen={openPrepMe}
        />
      )}

      {prepMeOpen && prepMeParams && (
        <PrepMePanel
          {...prepMeParams}
          onClose={() => setPrepMeOpen(false)}
        />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {setupIncomplete ? (
            <GetStartedCard companyId={companyId} companyName={companyName} hasResearch={hasResearch} hasDepartments={hasDepartments} hasContacts={hasContacts} signalCount={signalCount} contactCount={contactCount} />
          ) : (
            <>
              {/* State 2: Company Snapshot */}
              {companyData && (
                <div className="bg-card rounded-lg shadow p-6 border border-border">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Company Snapshot</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {companyData.industry && (
                      <div>
                        <span className="font-medium text-card-foreground">Industry:</span>{' '}
                        <span className="text-muted-foreground">{companyData.industry}</span>
                      </div>
                    )}
                    {companyData.revenue && (
                      <div>
                        <span className="font-medium text-card-foreground">Revenue:</span>{' '}
                        <span className="text-muted-foreground">{companyData.revenue}</span>
                      </div>
                    )}
                    {companyData.employees && (
                      <div>
                        <span className="font-medium text-card-foreground">Employees:</span>{' '}
                        <span className="text-muted-foreground">{companyData.employees}</span>
                      </div>
                    )}
                    {companyData.headquarters && (
                      <div>
                        <span className="font-medium text-card-foreground">HQ:</span>{' '}
                        <span className="text-muted-foreground">{companyData.headquarters}</span>
                      </div>
                    )}
                    {companyData.website && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-card-foreground">Website:</span>{' '}
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
                <p className="text-sm text-muted-foreground">
                  Research updated {new Date(companyData.accountIntelligenceCompletedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                </p>
              )}

              {/* Buying group coverage */}
              <BuyingGroupCoverageCard departments={departments} campaigns={campaigns} />

              {/* Business Overview and Key Initiatives */}
              {companyData && (companyData.businessOverview || (companyData.keyInitiatives && companyData.keyInitiatives.length > 0)) && (
                <div className="bg-card rounded-lg shadow p-6 border border-border">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Business Overview & Key Initiatives</h2>
                  {companyData.businessOverview && (
                    <div className="mb-4">
                      <p className="text-muted-foreground">{companyData.businessOverview}</p>
                    </div>
                  )}
                  {companyData.keyInitiatives && companyData.keyInitiatives.length > 0 && (
                    <div>
                      <h3 className="font-medium text-card-foreground mb-2">Key Initiatives</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
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

              {/* Existing Stack */}
              <ExistingStackEditor
                companyId={companyId}
                catalogProducts={(catalogProducts as Array<{ id: string; name: string }>).map((p) => ({ id: p.id, name: p.name }))}
                departments={(departments as Array<{ id: string; customName: string | null; type: string }>).map((d) => ({
                  id: d.id,
                  name: d.customName ?? d.type.replace(/_/g, ' '),
                }))}
              />

              {/* Active Objections */}
              <ActiveObjectionsPanel
                companyId={companyId}
                divisions={(departments as Array<{ id: string; customName: string | null; type: string }>).map((d) => ({
                  id: d.id,
                  name: d.customName ?? d.type.replace(/_/g, ' '),
                }))}
              />

              {/* Engagement Summary */}
              {engagementByDept.length > 0 && (
                <EngagementSummaryCard rows={engagementByDept} />
              )}

              {/* Recent Signals */}
              <RecentSignalsCard companyId={companyId} companyName={companyName} />
            </>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <ContactsByBuyingGroup
          companyId={companyId}
          companyName={companyName}
          initialDepartmentId={urlContext?.division ?? undefined}
          autoFind={urlContext?.action === 'find'}
          autoAdd={urlContext?.action === 'add'}
          contactName={urlContext?.contactName ?? undefined}
          onPrepMeOpen={openPrepMe}
        />
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
          initialDepartmentId={urlContext?.division ?? undefined}
          signalId={urlContext?.signal ?? undefined}
          initialType={urlContext?.type ?? undefined}
          contentFilter={urlContext?.contentFilter ?? undefined}
          autoCreate={urlContext?.action === 'create'}
          initialContactId={urlContext?.contact ?? undefined}
        />
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
  signalCount,
  contactCount,
}: {
  companyId: string;
  companyName: string;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasContacts: boolean;
  signalCount: number;
  contactCount: number;
}) {
  const intelligenceHref = `/dashboard/companies/${companyId}/intelligence`;
  const contactsHref = `/dashboard/companies/${companyId}?tab=contacts&action=find`;

  const stepsComplete = [hasResearch, hasDepartments, hasContacts].filter(Boolean).length;
  const anyProgress = stepsComplete > 0;

  const steps = [
    {
      done: hasResearch,
      label: 'Account intelligence',
      detail: hasResearch
        ? `${signalCount} signal${signalCount !== 1 ? 's' : ''} found, ${contactCount} contact${contactCount !== 1 ? 's' : ''} discovered`
        : 'Research news, signals, and decision makers',
    },
    {
      done: hasDepartments,
      label: 'Buying groups',
      detail: hasDepartments
        ? 'Segments configured'
        : 'Define how this account buys',
    },
    {
      done: hasContacts,
      label: 'Contacts',
      detail: hasContacts
        ? `${contactCount} contact${contactCount !== 1 ? 's' : ''} mapped`
        : 'Find and map contacts to each group',
    },
  ];

  let ctaLabel: string;
  let ctaHref: string;
  if (!hasResearch) {
    ctaLabel = 'Run Account Intelligence';
    ctaHref = intelligenceHref;
  } else if (!hasDepartments) {
    ctaLabel = 'Set Up Buying Groups';
    ctaHref = intelligenceHref;
  } else {
    ctaLabel = 'Find Contacts';
    ctaHref = contactsHref;
  }

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {anyProgress ? `Continue setting up ${companyName}` : `Get started with ${companyName}`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to unlock AI-powered plays and outreach.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1">
            <span className="text-xs font-semibold text-blue-400">{stepsComplete}/3</span>
            <span className="text-xs text-blue-400/70">complete</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out"
              style={{ width: `${(stepsComplete / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-1 mb-6">
          {steps.map((step, i) => {
            const isNext = !step.done && steps.slice(0, i).every((s) => s.done);
            return (
              <div
                key={step.label}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-3 transition-all',
                  isNext && 'bg-blue-500/5 border border-blue-500/15',
                  step.done && 'opacity-70',
                  !step.done && !isNext && 'opacity-40',
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  {step.done ? (
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : isNext ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm',
                    step.done ? 'text-muted-foreground' : isNext ? 'text-foreground font-medium' : 'text-muted-foreground/60',
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {step.detail}
                  </p>
                </div>
                {isNext && (
                  <div className="shrink-0 mt-0.5">
                    <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            {ctaLabel}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <span className="text-xs text-muted-foreground">
            {!hasResearch ? '~30 seconds' : !hasDepartments ? '~2 minutes' : '~2 minutes'}
          </span>
        </div>
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
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <h2 className="text-xl font-semibold text-card-foreground mb-2">Buying group coverage</h2>
      <p className="text-sm text-muted-foreground">
        {withContacts} of {total} groups have contacts; {withLivePages} have live pages.
      </p>
    </div>
  );
}

function EngagementSummaryCard({ rows }: { rows: EngagementRow[] }) {
  const totalEmails = rows.reduce((s, r) => s + r.emailsSent, 0);
  const totalReplies = rows.reduce((s, r) => s + r.replies, 0);
  const totalMeetings = rows.reduce((s, r) => s + r.meetings, 0);

  return (
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <h2 className="text-lg font-semibold text-card-foreground mb-1">Engagement Summary</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {totalEmails} emails sent &middot; {totalReplies} replies &middot; {totalMeetings} meetings
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="pb-2 font-medium">Buying Group</th>
              <th className="pb-2 font-medium text-right">Contacts</th>
              <th className="pb-2 font-medium text-right">Emails</th>
              <th className="pb-2 font-medium text-right">Replies</th>
              <th className="pb-2 font-medium text-right">Meetings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 text-card-foreground font-medium">{row.name}</td>
                <td className="py-2 text-right text-muted-foreground">{row.contactCount}</td>
                <td className="py-2 text-right text-muted-foreground">{row.emailsSent}</td>
                <td className="py-2 text-right text-muted-foreground">{row.replies}</td>
                <td className="py-2 text-right text-muted-foreground">{row.meetings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type RecentSignal = {
  tier: number;
  date: string;
  headline: string;
};

function RecentSignalsCard({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [signals, setSignals] = React.useState<RecentSignal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/signals?days=14`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setSignals((data.signals ?? []).slice(0, 5));
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  if (loading) return null;
  if (signals.length === 0) return null;

  const tierBadge = (tier: number) => {
    if (tier === 1) return 'bg-red-500/10 text-red-700 dark:text-red-400';
    if (tier === 2) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
  };
  const tierName = (tier: number) => (tier === 1 ? 'High' : tier === 2 ? 'Strategic' : 'FYI');

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">Recent Signals</h2>
      <div className="space-y-2">
        {signals.map((sig, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded', tierBadge(sig.tier))}>
              {tierName(sig.tier)}
            </span>
            <span className="flex-1 min-w-0 truncate text-card-foreground">
              {sig.headline}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(sig.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

