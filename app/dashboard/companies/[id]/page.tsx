import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCaseStudiesForUI } from '@/lib/prompt-context';
import { CompanyTabs } from '@/app/components/company/CompanyTabs';
import { DeleteCompanyButton } from '@/app/components/company/DeleteCompanyButton';
import { AccountChatWidget } from '@/app/components/company/AccountChatWidget';
import AccountWorkspacePage from './workspace/AccountWorkspacePage';
import { DepartmentStatus, ContentType } from '@prisma/client';

/** Parse estimatedOpportunity string (e.g. "$50K-$150K", "$500K – $2M") to a number. Uses midpoint for ranges. */
function parseEstimatedOpportunity(s: string | null): number | null {
  if (!s || !s.trim()) return null;
  const parts = s
    .replace(/\$/g, '')
    .split(/[\s–\-–—]+/)
    .map((p) => p.trim().toUpperCase().replace(/,/g, ''));
  const numbers: number[] = [];
  for (const p of parts) {
    const match = p.match(/^([\d.]+)\s*(K|M)?$/);
    if (match) {
      let n = Number(match[1]);
      if (match[2] === 'K') n *= 1000;
      else if (match[2] === 'M') n *= 1_000_000;
      numbers.push(n);
    }
  }
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return numbers[0];
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return Math.round((min + max) / 2);
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    division?: string;
    type?: string;
    signal?: string;
    contact?: string;
    action?: string;
    contactName?: string;
    contentFilter?: string;
    prepMe?: string;
    signalTitle?: string;
    signalSummary?: string;
    divisionName?: string;
    workflow?: string;
    workspace?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const search = await searchParams;

  if (search.workflow || search.workspace) {
    return <AccountWorkspacePage companyId={id} />;
  }

  const tabParam = search.tab;
  /** 6-tab set per Spec 2. Legacy tab params map to new tab so old links still work. */
  const validTabs = ['overview', 'buying-groups', 'contacts', 'content', 'engagement', 'signals'] as const;
  const legacyTabMap: Record<string, (typeof validTabs)[number]> = {
    departments: 'buying-groups',
    campaigns: 'content',
    activity: 'signals',
    messaging: 'content',
    map: 'contacts',
    expansion: 'overview',
  };
  const resolvedTab = (tabParam && legacyTabMap[tabParam]) ?? (tabParam as (typeof validTabs)[number] | undefined);

  /** URL context for deep-links (Spec 1). Passed to CompanyTabs for pre-loading. */
  const urlContext = {
    division: search.division ?? undefined,
    type: search.type ?? undefined,
    signal: search.signal ?? undefined,
    contact: search.contact ?? undefined,
    action: search.action ?? undefined,
    contactName: search.contactName ?? undefined,
    contentFilter: search.contentFilter ?? undefined,
  };

  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      domain: true,
      industry: true,
      website: true,
      employees: true,
      headquarters: true,
      revenue: true,
      businessOverview: true,
      dealObjective: true,
      keyInitiatives: true,
      researchData: true,
      segmentationStrategy: true,
      segmentationRationale: true,
      salesforceLastSyncedAt: true,
      salesforceOpportunityData: true,
      lastCrawlAt: true,
      nextCrawlAt: true,
      lastContentChangeAt: true,
      accountIntelligenceCompletedAt: true,
      updatedAt: true,
      user: {
        select: {
          salesforceAccessToken: true,
        },
      },
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        take: 1000, // Limit for activity filter dropdown
      },
      activities: { orderBy: { createdAt: 'desc' } },
      accountMessaging: true,
    },
  });

  if (!company) notFound();

  /** Prep Me from URL (e.g. from dashboard HotSignals "Prep Me" link). Opens panel on mount. */
  const prepMeFromUrl =
    search.prepMe
      ? {
          signalTitle: typeof search.signalTitle === 'string' ? search.signalTitle : undefined,
          signalSummary: typeof search.signalSummary === 'string' ? search.signalSummary : undefined,
          divisionName: typeof search.divisionName === 'string' ? search.divisionName : undefined,
        }
      : null;

  const companyProductsForTotals = await prisma.companyProduct.findMany({
    where: { companyId: id },
    select: { status: true, arr: true, opportunitySize: true },
  });
  const currentARR = companyProductsForTotals
    .filter((cp) => cp.status === 'ACTIVE')
    .reduce((sum, cp) => sum + Number(cp.arr ?? 0), 0);
  let expansionOpportunity = companyProductsForTotals
    .filter((cp) => cp.status === 'OPPORTUNITY')
    .reduce((sum, cp) => sum + Number(cp.opportunitySize ?? 0), 0);

  const departmentsRaw = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    include: {
      _count: { select: { contacts: true, activities: true } },
      contacts: {
        take: 2,
        orderBy: { lastContactedAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          engagementScore: true,
          persona: { select: { name: true } },
        },
      },
      companyProducts: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activitiesByDept = await prisma.activity.findMany({
    where: { companyId: id, companyDepartmentId: { not: null } },
    select: { companyDepartmentId: true, summary: true, type: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const lastActivityByDeptId: Record<string, { summary: string; type: string; createdAt: Date }> = {};
  for (const a of activitiesByDept) {
    const deptId = a.companyDepartmentId as string;
    if (deptId && !lastActivityByDeptId[deptId]) {
      lastActivityByDeptId[deptId] = {
        summary: a.summary,
        type: a.type,
        createdAt: a.createdAt,
      };
    }
  }

  // When no CompanyProduct opportunity data, derive expansion from department estimatedOpportunity (e.g. "$50K-$150K")
  if (expansionOpportunity === 0 && departmentsRaw.length > 0) {
    const parsed = departmentsRaw
      .map((d) => parseEstimatedOpportunity(d.estimatedOpportunity))
      .filter((n): n is number => n != null);
    if (parsed.length > 0) {
      expansionOpportunity = parsed.reduce((a, b) => a + b, 0);
    }
  }

  const targetARR = currentARR + expansionOpportunity;

  const departments = departmentsRaw.map(
    (d: (typeof departmentsRaw)[number]) => ({
      ...d,
      valueProp: d.valueProp,
      useCase: d.useCase,
      estimatedOpportunity: d.estimatedOpportunity,
      objectionHandlers: d.objectionHandlers as Array<{ objection: string; response: string }> | null,
      proofPoints: d.proofPoints as string[] | null,
      contacts: d.contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        engagementScore: c.engagementScore,
        personaName: c.persona?.name ?? null,
      })),
      companyProducts: d.companyProducts.map(
        (cp: (typeof d.companyProducts)[number]) => ({
          id: cp.id,
          status: cp.status,
          productId: cp.productId,
          product: cp.product,
          arr: cp.arr != null ? Number(cp.arr) : null,
          contractEnd: cp.contractEnd,
          fitScore: cp.fitScore != null ? Number(cp.fitScore) : null,
          fitReasoning: cp.fitReasoning,
          opportunitySize: cp.opportunitySize != null ? Number(cp.opportunitySize) : null,
        })
      ),
      lastActivity: d.id ? lastActivityByDeptId[d.id] ?? null : null,
    })
  );

  const matrixDepartmentsRaw = await prisma.companyDepartment.findMany({
    where: { companyId: id },
    include: {
      companyProducts: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, priceMin: true, priceMax: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const catalogProductsRaw = await prisma.catalogProduct.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, priceMin: true, priceMax: true },
  });

  // Serialize for Client Component: Prisma Decimal -> number
  const matrixDepartments = matrixDepartmentsRaw.map(
    (d: (typeof matrixDepartmentsRaw)[number]) => ({
      ...d,
      companyProducts: d.companyProducts.map(
        (cp: (typeof d.companyProducts)[number]) => ({
          ...cp,
          arr: cp.arr != null ? Number(cp.arr) : null,
          opportunitySize: cp.opportunitySize != null ? Number(cp.opportunitySize) : null,
          fitScore: cp.fitScore != null ? Number(cp.fitScore) : null,
          product: {
            ...cp.product,
            priceMin: cp.product.priceMin != null ? Number(cp.product.priceMin) : null,
            priceMax: cp.product.priceMax != null ? Number(cp.product.priceMax) : null,
          },
        })
      ),
    })
  );

  const catalogProducts = catalogProductsRaw.map(
    (p: (typeof catalogProductsRaw)[number]) => ({
      ...p,
      priceMin: p.priceMin != null ? Number(p.priceMin) : null,
      priceMax: p.priceMax != null ? Number(p.priceMax) : null,
    })
  );

  const accountMessaging = company.accountMessaging
    ? {
        id: company.accountMessaging.id,
        whyThisCompany: company.accountMessaging.whyThisCompany as string[] | null,
        useCases: company.accountMessaging.useCases as unknown[] | null,
        successStories: company.accountMessaging.successStories as unknown[] | null,
        objectionHandlers: company.accountMessaging.objectionHandlers as unknown[] | null,
        doNotMention: company.accountMessaging.doNotMention as unknown[] | null,
        aiGenerated: company.accountMessaging.aiGenerated,
        updatedAt: company.accountMessaging.updatedAt.toISOString(),
      }
    : null;

  const [segmentCampaigns, contentCount] = await Promise.all([
    prisma.segmentCampaign.findMany({
      where: { companyId: id, userId: session.user.id },
      include: { department: { select: { id: true, customName: true, type: true } } },
      orderBy: [{ departmentId: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.companyDepartmentContent.count({
      where: { companyDepartment: { companyId: id } },
    }),
  ]);
  const campaigns = segmentCampaigns.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    url: c.url,
    type: c.type,
    departmentId: c.departmentId,
    department: c.department
      ? { id: c.department.id, customName: c.department.customName, type: c.department.type }
      : null,
    headline: c.headline,
    body: c.body,
    ctaLabel: c.ctaLabel,
    ctaUrl: c.ctaUrl,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const hasMessaging = !!accountMessaging;
  const hasResearch = !!company.researchData;
  const hasDepartments = departments.length > 0;
  const hasContacts = company.contacts.length > 0;
  const hasContent = contentCount > 0;
  const hasCampaign = campaigns.length > 0;

  const setupIncomplete = !hasResearch || departments.length === 0 || company.contacts.length === 0;
  const initialTab =
    setupIncomplete
      ? 'overview'
      : (resolvedTab && validTabs.includes(resolvedTab)
        ? resolvedTab
        : 'overview');

  const TAB_LABELS: Record<(typeof validTabs)[number], string> = {
    overview: 'Overview',
    'buying-groups': 'Buying Groups',
    contacts: 'Contacts',
    content: 'Content',
    engagement: 'Engagement',
    signals: 'Signals',
  };
  const divisionDept = search.division
    ? departments.find((d: { id: string }) => d.id === search.division)
    : null;
  const divisionName = divisionDept
    ? (divisionDept.customName ?? (divisionDept as { type?: string }).type?.replace(/_/g, ' ') ?? 'Division')
    : null;
  /** Edge case: URL references a division that was deleted (Spec 1). */
  const divisionInvalid = !!search.division && !divisionDept;

  const [contentLibraryForMessaging, caseStudies] = await Promise.all([
    prisma.contentLibrary.findMany({
      where: {
        userId: session.user.id,
        type: { in: [ContentType.UseCase, ContentType.SuccessStory] },
        isActive: true,
      },
      select: { id: true, title: true, type: true },
      orderBy: { title: 'asc' },
      take: 100,
    }),
    getCaseStudiesForUI(session.user.id, company.industry ?? null),
  ]);

  type DeptItem = (typeof departments)[number];
  const deptLabel = (d: { type: string; customName: string | null }) =>
    d.customName || d.type.replace(/_/g, ' ');
  const expansionStrategy = {
    phase1: departments
      .filter((d: DeptItem) => d.status === DepartmentStatus.EXPANSION_TARGET || d.status === DepartmentStatus.RESEARCH_PHASE)
      .map(deptLabel),
    phase2: departments
      .filter((d: DeptItem) => d.status === DepartmentStatus.ACTIVE_CUSTOMER)
      .map(deptLabel),
    phase3: departments
      .filter((d: DeptItem) => d.status === DepartmentStatus.NOT_ENGAGED || d.status === DepartmentStatus.NOT_APPLICABLE)
      .map(deptLabel),
  };

  // Engagement metrics: activities and new contacts by department
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activitiesForEngagement, newContactsRaw] =
    await Promise.all([
      prisma.activity.findMany({
        where: { companyId: id, companyDepartmentId: { not: null } },
        select: { companyDepartmentId: true, type: true },
      }),
      prisma.contact.groupBy({
        by: ['companyDepartmentId'],
        where: {
          companyId: id,
          companyDepartmentId: { not: null },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      }),
    ]);

  const newContactCountByDept: Record<string, number> = {};
  for (const r of newContactsRaw) {
    if (r.companyDepartmentId) newContactCountByDept[r.companyDepartmentId] = r._count;
  }

  const activityCountsByDept: Record<
    string,
    { emailsSent: number; meetings: number; replies: number }
  > = {};
  const emailTypes = ['Email', 'EMAIL_SENT'];
  const replyTypes = ['EmailReply', 'EMAIL_REPLIED'];
  for (const a of activitiesForEngagement) {
    const deptId = a.companyDepartmentId as string;
    if (!deptId) continue;
    if (!activityCountsByDept[deptId])
      activityCountsByDept[deptId] = { emailsSent: 0, meetings: 0, replies: 0 };
    if (emailTypes.includes(a.type)) activityCountsByDept[deptId].emailsSent++;
    else if (a.type === 'Meeting') activityCountsByDept[deptId].meetings++;
    else if (replyTypes.includes(a.type)) activityCountsByDept[deptId].replies++;
  }

  const engagementByDept = departments.map((d: DeptItem) => {
    const counts = activityCountsByDept[d.id] ?? {
      emailsSent: 0,
      meetings: 0,
      replies: 0,
    };
    return {
      id: d.id,
      name: deptLabel(d),
      contactCount: d._count?.contacts ?? 0,
      newContactCount: newContactCountByDept[d.id] ?? 0,
      emailsSent: counts.emailsSent,
      meetings: counts.meetings,
      replies: counts.replies,
      invitesAccepted: 0,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb: Dashboard > Company > Tab > Division (Spec 1 Phase 5.2) */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/dashboard/companies/${id}?tab=overview`}
            className="text-primary hover:underline"
          >
            {company.name}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium">
            {TAB_LABELS[initialTab]}
          </span>
          {divisionName && (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/dashboard/companies/${id}?tab=${initialTab}`}
                className="text-primary hover:underline"
                title="Clear division filter"
              >
                {divisionName}
              </Link>
            </>
          )}
        </nav>

        {/* Edge case: Deleted division — clear state, no 500 (Spec 1) */}
        {divisionInvalid && (
          <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              The division referenced by this link is no longer available.
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/companies/${id}?tab=${initialTab}`}
                className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
              >
                Show all divisions
              </Link>
              <span className="text-amber-600 dark:text-amber-400" aria-hidden>|</span>
              <Link
                href={`/dashboard/companies/${id}?tab=overview`}
                className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
              >
                Overview
              </Link>
            </div>
          </div>
        )}

        {/* Company Header */}
        <div className="bg-card rounded-lg shadow p-6 mb-6 border border-border">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-card-foreground">{company.name}</h1>
              <p className="text-muted-foreground">{company.domain ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              {company.researchData ? (
                <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  ✅ AI Researched
                </span>
              ) : null}
              <DeleteCompanyButton companyId={company.id} companyName={company.name} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>Industry: {company.industry || 'Not specified'}</span>
            <span>•</span>
            <span>{company.contacts.length} contacts</span>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-6">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current ARR</div>
              <div className="text-xl font-semibold text-card-foreground">
                ${currentARR.toLocaleString()}
              </div>
              <Link href={`/dashboard/companies/${id}#engagement`} className="text-xs text-primary hover:underline mt-1 inline-block">Engagement</Link>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expansion Opportunity</div>
              <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                ${expansionOpportunity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target ARR</div>
              <div className="text-xl font-semibold text-card-foreground">
                ${targetARR.toLocaleString()}
                {expansionOpportunity > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({((expansionOpportunity / (currentARR || 1)) * 100).toFixed(0)}% growth potential)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Overview, Buying Groups, Contacts, Content, Engagement, Signals (6-tab set) */}
        <div className="mb-6">
          <CompanyTabs
            companyId={company.id}
            companyName={company.name}
            companyData={{
              dealObjective: company.dealObjective,
              industry: company.industry,
              domain: company.domain,
              website: company.website,
              employees: company.employees,
              headquarters: company.headquarters,
              revenue: company.revenue,
              businessOverview: company.businessOverview,
              keyInitiatives: company.keyInitiatives as string[] | null,
              segmentationStrategy: company.segmentationStrategy,
              segmentationRationale: company.segmentationRationale,
              salesforceLastSyncedAt: company.salesforceLastSyncedAt,
              salesforceOpportunityData: company.salesforceOpportunityData as {
                opportunityName?: string;
                stage?: string;
                amount?: string;
                closeDate?: string;
                daysUntilClose?: number;
                lastActivityDate?: string;
              } | null,
              hasSalesforceAccess: !!company.user.salesforceAccessToken,
              lastCrawlAt: company.lastCrawlAt,
              nextCrawlAt: company.nextCrawlAt,
              lastContentChangeAt: company.lastContentChangeAt,
              accountIntelligenceCompletedAt: company.accountIntelligenceCompletedAt,
            }}
            departments={departments}
            matrixDepartments={matrixDepartments}
            catalogProducts={catalogProducts}
            caseStudies={caseStudies}
            activities={company.activities}
            contacts={company.contacts.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
            }))}
            contactCount={company.contacts.length}
            expansionStrategy={expansionStrategy}
            accountMessaging={accountMessaging}
            contentLibraryUseCasesAndStories={contentLibraryForMessaging}
            initialTab={initialTab}
            prepMeFromUrl={prepMeFromUrl}
            urlContext={divisionInvalid ? { ...urlContext, division: undefined } : urlContext}
            campaigns={campaigns}
            researchDataKey={company.updatedAt?.getTime() ?? 0}
            engagementByDept={engagementByDept}
            setupIncomplete={setupIncomplete}
            hasResearch={hasResearch}
            hasDepartments={hasDepartments}
            hasContacts={hasContacts}
          />
        </div>
      </div>

      {/* Chat Agent Widget */}
      <AccountChatWidget accountId={company.id} companyName={company.name} />
    </div>
  );
}
