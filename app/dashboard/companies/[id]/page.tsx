import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { CompanyTabs } from '@/app/components/company/CompanyTabs';
import { ProgressSteps } from '@/app/components/company/ProgressSteps';
import { CompanyARRActions } from '@/app/components/company/CompanyARRActions';
import { DeleteCompanyButton } from '@/app/components/company/DeleteCompanyButton';
import { DepartmentStatus, ContentType } from '@prisma/client';

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const initialTab = tabParam === 'messaging' ? 'messaging' : tabParam === 'campaigns' ? 'campaigns' : undefined;
  type CompanyWithRelations = {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    researchData: unknown;
    contacts: Array<{ id: string }>;
    activities: Array<{ id: string; type: string; summary: string; createdAt: Date }>;
    accountMessaging: {
      id: string;
      whyThisCompany: unknown;
      useCases: unknown;
      successStories: unknown;
      objectionHandlers: unknown;
      doNotMention: unknown;
      aiGenerated: boolean;
      updatedAt: Date;
    } | null;
  };
  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contacts: { select: { id: true } },
      activities: { orderBy: { createdAt: 'desc' } },
      accountMessaging: true,
    },
  }) as CompanyWithRelations | null;

  if (!company) notFound();

  const companyProductsForTotals = await prisma.companyProduct.findMany({
    where: { companyId: id },
    select: { status: true, arr: true, opportunitySize: true },
  });
  const currentARR = companyProductsForTotals
    .filter((cp) => cp.status === 'ACTIVE')
    .reduce((sum, cp) => sum + Number(cp.arr ?? 0), 0);
  const expansionOpportunity = companyProductsForTotals
    .filter((cp) => cp.status === 'OPPORTUNITY')
    .reduce((sum, cp) => sum + Number(cp.opportunitySize ?? 0), 0);
  const targetARR = currentARR + expansionOpportunity;

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

  const departments = departmentsRaw.map(
    (d: (typeof departmentsRaw)[number]) => ({
      ...d,
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

  const hasMessaging = !!accountMessaging;

  const contentLibraryForMessaging = await prisma.contentLibrary.findMany({
    where: {
      userId: session.user.id,
      type: { in: [ContentType.UseCase, ContentType.SuccessStory] },
      isActive: true,
    },
    select: { id: true, title: true, type: true },
    orderBy: { title: 'asc' },
    take: 100,
  });

  const segmentCampaigns = await prisma.segmentCampaign.findMany({
    where: { companyId: id, userId: session.user.id },
    include: { department: { select: { id: true, customName: true, type: true } } },
    orderBy: [{ departmentId: 'asc' }, { createdAt: 'desc' }],
  });
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

  // Pipeline by microsegment (department)
  const pipelineByMicrosegment = departments.map((d: DeptItem) => {
    const value = (d.companyProducts as Array<{ status: string; opportunitySize: number | null }>)
      .filter((cp) => cp.status === 'OPPORTUNITY')
      .reduce((sum, cp) => sum + Number(cp.opportunitySize ?? 0), 0);
    return {
      departmentId: d.id,
      departmentName: deptLabel(d),
      pipelineValue: value,
    };
  }).filter((p) => p.pipelineValue > 0);

  // Funnel counts: contacted, engaged, meetings, opportunity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [contactedCount, engagedCount, meetingsCount, activitiesForEngagement, newContactsRaw] =
    await Promise.all([
      prisma.contact.count({ where: { companyId: id, lastContactedAt: { not: null } } }),
      prisma.contact.count({ where: { companyId: id, isResponsive: true } }),
      prisma.activity.count({ where: { companyId: id, type: 'Meeting' } }),
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

  const funnel = {
    contacted: contactedCount,
    engaged: engagedCount,
    meetings: meetingsCount,
    opportunity: Math.round(expansionOpportunity),
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard/companies"
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Target companies
        </Link>

        {/* Company Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-zinc-700">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{company.name}</h1>
              <p className="text-gray-600 dark:text-gray-300">{company.domain ?? '—'}</p>
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
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Industry: {company.industry || 'Not specified'}</span>
            <span>•</span>
            <span>{company.contacts.length} contacts</span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-600 flex flex-wrap gap-6">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current ARR</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                ${currentARR.toLocaleString()}
              </div>
              <Link href={`/dashboard/companies/${id}#engagement`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">Engagement</Link>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expansion Opportunity</div>
              <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                ${expansionOpportunity.toLocaleString()}
              </div>
              <CompanyARRActions companyId={id} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target ARR</div>
              <div className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                ${targetARR.toLocaleString()}
                {expansionOpportunity > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                    ({((expansionOpportunity / (currentARR || 1)) * 100).toFixed(0)}% growth potential)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {initialTab === 'campaigns' && (
          <div className="mb-6">
            <ProgressSteps
              companyId={id}
              companyName={company.name}
              currentStep={!hasMessaging || !company.researchData || departments.length === 0 ? 1 : 2}
            />
          </div>
        )}

        {/* Tabs: Departments, Overview, Contacts, Engagement, Activity, Messaging, Campaigns */}
        <div className="mb-6">
          <CompanyTabs
            companyId={company.id}
            companyName={company.name}
            departments={departments}
            matrixDepartments={matrixDepartments}
            catalogProducts={catalogProducts}
            activities={company.activities}
            contactCount={company.contacts.length}
            expansionStrategy={expansionStrategy}
            accountMessaging={accountMessaging}
            contentLibraryUseCasesAndStories={contentLibraryForMessaging}
            initialTab={initialTab}
            pipelineByMicrosegment={pipelineByMicrosegment}
            funnel={funnel}
            campaigns={campaigns}
            researchDataKey={company.updatedAt?.getTime() ?? 0}
            engagementByDept={engagementByDept}
          />
        </div>
      </div>
    </div>
  );
}
