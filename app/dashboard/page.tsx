import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AccountCard } from '@/app/components/dashboard/AccountCard';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ skip_content_prompt?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const firstName = session.user.name?.split(' ')[0] ?? 'User';

  // Content Library counts: if user has no content, send to Company setup or Content Library
  const [contentLibraryCounts, catalogProductCount, industryPlaybookCount] = await Promise.all([
    prisma.contentLibrary.groupBy({
      by: ['type'],
      where: { userId: session.user.id, isActive: true },
      _count: { id: true },
    }),
    prisma.catalogProduct.count(),
    prisma.industryPlaybook.count({ where: { userId: session.user.id } }),
  ]);
  const countByType = Object.fromEntries(
    contentLibraryCounts.map((c) => [c.type, c._count.id])
  ) as Partial<Record<string, number>>;
  const contentLibraryTotal =
    catalogProductCount +
    industryPlaybookCount +
    (countByType.UseCase ?? 0) +
    (countByType.SuccessStory ?? 0) +
    (countByType.CompanyEvent ?? 0) +
    (countByType.Framework ?? 0);
  const params = await searchParams;
  if (contentLibraryTotal === 0 && params?.skip_content_prompt !== '1') {
    redirect('/dashboard/content-library');
  }


  // Pipeline and meetings (this month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const [pipelineRows, meetingsThisMonth] = await Promise.all([
    prisma.companyProduct.findMany({
      where: {
        company: { userId: session.user.id },
        status: 'OPPORTUNITY',
        opportunitySize: { not: null },
      },
      select: { opportunitySize: true },
    }),
    prisma.activity.count({
      where: {
        userId: session.user.id,
        type: 'Meeting',
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);
  const totalPipeline = pipelineRows.reduce(
    (sum, r) => sum + Number(r.opportunitySize ?? 0),
    0
  );

  // Top microsegments (departments with most opportunity or contacts)
  const topDepartments = await prisma.companyDepartment.findMany({
    where: { company: { userId: session.user.id } },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { contacts: true } },
      companyProducts: {
        where: { status: 'OPPORTUNITY' },
        select: { opportunitySize: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const withPipeline = topDepartments.map((d) => ({
    id: d.id,
    name: d.customName || d.type.replace(/_/g, ' '),
    companyName: d.company.name,
    companyId: d.company.id,
    contactCount: d._count.contacts,
    pipeline: d.companyProducts.reduce((s, cp) => s + Number(cp.opportunitySize ?? 0), 0),
  }));
  const topMicrosegments = withPipeline
    .sort((a, b) => b.pipeline - a.pipeline || b.contactCount - a.contactCount)
    .slice(0, 5);

  // Companies (tracked accounts) with data for AccountCard
  const companiesRaw = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      _count: { 
        select: { 
          contacts: true, 
          departments: true,
          activities: true,
        } 
      },
      departments: {
        include: {
          _count: { select: { contacts: true } },
        },
      },
    },
  });

  // Get campaign counts and last activity per company
  const companyIds = companiesRaw.map((c) => c.id);
  const [campaignCounts, lastActivities] = await Promise.all([
    prisma.segmentCampaign.groupBy({
      by: ['companyId'],
      where: { companyId: { in: companyIds } },
      _count: true,
    }),
    prisma.activity.findMany({
      where: { 
        companyId: { in: companyIds },
        userId: session.user.id,
      },
      select: {
        companyId: true,
        createdAt: true,
        type: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const campaignCountByCompany = new Map(
    campaignCounts.map((c) => [c.companyId, c._count])
  );
  
  const lastActivityByCompany = new Map<string, Date>();
  for (const activity of lastActivities) {
    if (activity.companyId && !lastActivityByCompany.has(activity.companyId)) {
      lastActivityByCompany.set(activity.companyId, activity.createdAt);
    }
  }

  // Check for engagement (email or meeting activities)
  const engagementByCompany = new Set<string>();
  for (const activity of lastActivities) {
    if (activity.companyId && (activity.type === 'Email' || activity.type === 'Meeting' || activity.type === 'EMAIL_SENT')) {
      engagementByCompany.add(activity.companyId);
    }
  }

  type CompanyRaw = (typeof companiesRaw)[number];
  type DeptRaw = CompanyRaw['departments'][number];
  const companies = companiesRaw.map((c: CompanyRaw) => {
    const hasResearch = (c.researchData != null && typeof c.researchData === 'object' && Object.keys(c.researchData as object).length > 0) || c._count.departments > 0;
    const hasCampaigns = (campaignCountByCompany.get(c.id) ?? 0) > 0;
    const hasEngagement = engagementByCompany.has(c.id);
    
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      hasResearch,
      contactCount: c._count.contacts,
      hasCampaigns,
      hasEngagement,
      lastActivity: lastActivityByCompany.get(c.id) ?? c.updatedAt,
      _count: c._count,
      departments: c.departments.map((d: DeptRaw) => ({
        id: d.id,
        type: d.type,
        customName: d.customName,
        status: d.status,
        _count: d._count,
      })),
    };
  });

  // Activity stats for instruments
  const activities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    select: { type: true },
  });
  const contactsDiscovered = activities.filter((a: { type: string }) => a.type === 'ContactDiscovered').length;
  const emailsSent = activities.filter((a: { type: string }) => a.type === 'Email').length;
  const repliesReceived = activities.filter((a: { type: string }) => a.type === 'EmailReply').length;

  // Recent activity (last 5)
  const recentActivities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, type: true, summary: true, createdAt: true, company: { select: { name: true } } },
  });

  // Plays needing action (nextActionDue today or soon)
  const playsNeedingAction = await prisma.expansionPlay.findMany({
    where: {
      company: { userId: session.user.id },
      status: { notIn: ['WON', 'LOST'] },
      nextActionDue: { not: null },
    },
    include: {
      company: { select: { name: true } },
      companyDepartment: { select: { customName: true, type: true } },
      product: { select: { name: true } },
    },
    orderBy: { nextActionDue: 'asc' },
    take: 5,
  });

  const now = new Date();
  const dueForNextTouch = await prisma.contactSequenceEnrollment.findMany({
    where: {
      userId: session.user.id,
      status: 'active',
      nextTouchDueAt: { lte: now },
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      sequence: { select: { name: true } },
    },
    orderBy: { nextTouchDueAt: 'asc' },
    take: 10,
  });
  const dueForNextTouchWithCompany = await Promise.all(
    dueForNextTouch.map(async (e) => {
      const c = await prisma.contact.findUnique({
        where: { id: e.contactId },
        select: { companyId: true },
      });
      const company = c
        ? await prisma.company.findUnique({
            where: { id: c.companyId },
            select: { id: true, name: true },
          })
        : null;
      return {
        enrollmentId: e.id,
        contactId: e.contactId,
        contactName: [e.contact.firstName, e.contact.lastName].filter(Boolean).join(' ').trim() || 'Contact',
        sequenceName: e.sequence.name,
        companyId: company?.id ?? null,
        companyName: company?.name ?? null,
      };
    })
  );

  const totalDepartments = companies.reduce((sum: number, c: { _count: { departments: number } }) => sum + c._count.departments, 0);

  return (
    <div className="min-h-screen bg-zinc-900 text-slate-100">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(248 250 252) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(248 250 252) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard headline */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Accounts and pipeline
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dueForNextTouchWithCompany.length > 0 && (
              <Link
                href={dueForNextTouchWithCompany[0]?.companyId ? `/chat?play=expansion&accountId=${dueForNextTouchWithCompany[0].companyId}` : '/dashboard/companies'}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20"
              >
                <span>Due for next touch</span>
                <span className="rounded-full bg-blue-500/90 px-2 py-0.5 text-xs font-semibold text-zinc-900">
                  {dueForNextTouchWithCompany.length}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Success metrics: pipeline, meetings, top microsegments */}
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total pipeline</p>
            <p className="mt-1 text-xl font-bold text-amber-400 tabular-nums">
              ${(totalPipeline / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meetings this month</p>
            <p className="mt-1 text-xl font-bold text-emerald-400 tabular-nums">{meetingsThisMonth}</p>
          </div>
        </section>

        {/* Top microsegments */}
        {topMicrosegments.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Top microsegments
            </h2>
            <ul className="rounded-lg border border-slate-700 bg-zinc-800/80 divide-y divide-slate-700">
              {topMicrosegments.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/dashboard/companies/${d.companyId}`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-700/50 transition-colors"
                  >
                    <span className="text-slate-200">
                      {d.companyName} → {d.name}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {d.pipeline > 0 ? `$${(d.pipeline / 1000).toFixed(0)}K` : ''}
                      {d.pipeline > 0 && d.contactCount > 0 ? ' · ' : ''}
                      {d.contactCount} contact{d.contactCount !== 1 ? 's' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/analytics" className="mt-2 inline-block text-xs text-slate-500 hover:text-amber-400">
              Analytics →
            </Link>
          </section>
        )}

        {/* Tracked accounts: full width, each company = card with contacts per dept + matrix */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Tracked accounts
          </h2>
          {companies.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-8 text-center">
              <p className="text-slate-300 font-medium mb-1">Ready to get started?</p>
              <p className="text-slate-500 text-sm mb-4">Create your first target account to begin tracking engagement.</p>
              <Link
                href="/dashboard/companies/new"
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
              >
                Add your first target company
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {companies.map(
                (c: {
                  id: string;
                  name: string;
                  industry: string | null;
                  hasResearch: boolean;
                  contactCount: number;
                  hasCampaigns: boolean;
                  hasEngagement: boolean;
                  lastActivity: Date | null;
                  _count: { departments: number; contacts: number };
                  departments: Array<{
                    id: string;
                    type: string;
                    customName: string | null;
                    status: string;
                    _count: { contacts: number };
                  }>;
                }) => (
                  <div key={c.id} className="space-y-4">
                    <AccountCard
                      companyId={c.id}
                      companyName={c.name}
                      industry={c.industry}
                      hasResearch={c.hasResearch}
                      contactCount={c.contactCount}
                      hasCampaigns={c.hasCampaigns}
                      hasEngagement={c.hasEngagement}
                      lastActivity={c.lastActivity}
                    />
                    <div className="rounded-lg border border-slate-700 bg-zinc-800/60 p-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                        Contacts per department
                      </p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400 mb-4">
                        {c.departments.map((d) => (
                          <li key={d.id}>
                            {d.customName || d.type.replace(/_/g, ' ')}: {d._count.contacts} contact{d._count.contacts !== 1 ? 's' : ''}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/dashboard/companies/${c.id}#engagement`}
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        View engagement by buying group (emails, meetings, replies) →
                      </Link>
                    </div>
                  </div>
                )
              )}
              <Link
                href="/dashboard/companies"
                className="inline-block text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                View all target companies →
              </Link>
            </div>
          )}
        </section>

        {/* Widget grid: 2–3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Departments / coverage */}
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-5 hover:border-slate-600 transition-colors">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Coverage
            </h2>
            <p className="text-slate-300 text-sm mb-3">
              <span className="tabular-nums font-medium text-amber-400">{totalDepartments}</span> departments
              across <span className="tabular-nums font-medium">{companies.length}</span> account{companies.length !== 1 ? 's' : ''}
            </p>
            {companies.length > 0 && (
              <ul className="space-y-1.5 text-xs text-slate-500">
                {companies.slice(0, 3).flatMap((c: { id: string; name: string; departments: { id: string; type: string; customName: string | null }[] }) =>
                  c.departments.map((d: { id: string; type: string; customName: string | null }) => (
                    <li key={d.id}>
                      <Link
                        href={`/dashboard/companies/${c.id}/departments/${d.id}`}
                        className="hover:text-amber-400 transition-colors"
                      >
                        {c.name} → {d.customName || d.type.replace(/_/g, ' ')}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            )}
            {companies.length > 0 && (
              <Link
                href="/dashboard/companies"
                className="mt-3 inline-block text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                All companies →
              </Link>
            )}
          </div>

          {/* Instruments (metrics) */}
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-5 hover:border-slate-600 transition-colors">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              This week
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-amber-400">{contactsDiscovered}</p>
                <p className="text-xs text-slate-500 mt-0.5">Contacts discovered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-emerald-400">{emailsSent}</p>
                <p className="text-xs text-slate-500 mt-0.5">Emails sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-sky-400">{repliesReceived}</p>
                <p className="text-xs text-slate-500 mt-0.5">Replies</p>
              </div>
            </div>
          </div>

          {/* Next actions / recent activity — span 2 cols on xl */}
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-5 hover:border-slate-600 transition-colors xl:col-span-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Next up
            </h2>
            {playsNeedingAction.length > 0 ? (
              <ul className="space-y-2">
                {playsNeedingAction.map((p: { id: string; companyId: string; companyDepartmentId: string; company: { name: string }; companyDepartment: { customName: string | null; type: string }; nextActionSummary: string | null }) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/companies/${p.companyId}/departments/${p.companyDepartmentId}`}
                      className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-zinc-700/80 hover:text-white transition-colors"
                    >
                      <span className="font-medium">{p.company.name}</span>
                      <span className="text-slate-500 mx-1">·</span>
                      <span>{p.companyDepartment.customName || p.companyDepartment.type.replace(/_/g, ' ')}</span>
                      {p.nextActionSummary && (
                        <span className="text-slate-500 block mt-0.5 text-xs">{p.nextActionSummary}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : recentActivities.length > 0 ? (
              <ul className="space-y-2">
                {recentActivities.map((a: { id: string; summary: string; createdAt: Date; company: { name: string } | null }) => (
                  <li key={a.id} className="rounded-md px-3 py-2 text-sm text-slate-300">
                    <span className="text-slate-500 text-xs">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                    <span className="mx-2">·</span>
                    {a.summary}
                    {a.company && <span className="text-slate-500"> ({a.company.name})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm py-2">No recent activity</p>
            )}
            <Link
              href="/dashboard/companies"
              className="ml-3 inline-block text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              Target companies →
            </Link>
          </div>

          {/* Launch — expansion only */}
          <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-5 hover:border-slate-600 transition-colors">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Launch
            </h2>
            <Link
              href="/chat?play=expansion"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-zinc-700/80 hover:text-white transition-colors border border-slate-600 hover:border-amber-500/50"
            >
              <span className="text-lg">📈</span>
              Account Expansion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
