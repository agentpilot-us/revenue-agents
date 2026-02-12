import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DashboardProductMatrix } from '@/app/components/company/DashboardProductMatrix';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const firstName = session.user.name?.split(' ')[0] ?? 'Pilot';

  // Companies (tracked accounts) with full department + matrix data
  const companiesRaw = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      _count: { select: { contacts: true, departments: true } },
      departments: {
        include: {
          _count: { select: { contacts: true } },
          companyProducts: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  // Serialize Decimals and shape for DashboardProductMatrix
  type CompanyRaw = (typeof companiesRaw)[number];
  type DeptRaw = CompanyRaw['departments'][number];
  type CpRaw = DeptRaw['companyProducts'][number];
  const companies = companiesRaw.map((c: CompanyRaw) => ({
    id: c.id,
    name: c.name,
    _count: c._count,
    departments: c.departments.map((d: DeptRaw) => ({
      id: d.id,
      type: d.type,
      customName: d.customName,
      status: d.status,
      _count: d._count,
      companyProducts: d.companyProducts.map((cp: CpRaw) => ({
        productId: cp.productId,
        status: cp.status,
        arr: cp.arr != null ? Number(cp.arr) : null,
        opportunitySize: cp.opportunitySize != null ? Number(cp.opportunitySize) : null,
        product: cp.product,
      })),
    })),
  }));

  // Catalog products (once) for matrix columns
  const catalogProductsRaw = await prisma.catalogProduct.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });
  type CatalogRaw = (typeof catalogProductsRaw)[number];
  const catalogProducts = catalogProductsRaw.map((p: CatalogRaw) => ({ id: p.id, name: p.name }));

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
        {/* Flight deck headline */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Flight deck, {firstName}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Accounts and departments you&apos;re tracking
          </p>
        </div>

        {/* Tracked accounts: full width, each company = card with contacts per dept + matrix */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Tracked accounts
          </h2>
          {companies.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-zinc-800/80 p-8 text-center">
              <p className="text-slate-500 text-sm mb-4">No companies yet.</p>
              <Link
                href="/dashboard/companies/new"
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
              >
                Add your first company
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {companies.map(
                (c: {
                  id: string;
                  name: string;
                  _count: { departments: number; contacts: number };
                  departments: Array<{
                    id: string;
                    type: string;
                    customName: string | null;
                    status: string;
                    _count: { contacts: number };
                    companyProducts: Array<{
                      productId: string;
                      status: string;
                      arr: number | null;
                      opportunitySize: number | null;
                      product: { id: string; name: string };
                    }>;
                  }>;
                }) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-700 bg-zinc-800/80 p-5 hover:border-slate-600 transition-colors"
                  >
                    <Link
                      href={`/dashboard/companies/${c.id}`}
                      className="font-semibold text-slate-100 hover:text-amber-400 transition-colors"
                    >
                      {c.name}
                    </Link>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {c._count.departments} dept{c._count.departments !== 1 ? 's' : ''} · {c._count.contacts} contact{c._count.contacts !== 1 ? 's' : ''}
                    </p>
                    {/* Contacts per department */}
                    <div className="mt-3 mb-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                        Contacts per department
                      </p>
                      <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                        {c.departments.map((d) => (
                          <li key={d.id}>
                            {d.customName || d.type.replace(/_/g, ' ')}: {d._count.contacts} contact{d._count.contacts !== 1 ? 's' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Product penetration matrix */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                        Product penetration
                      </p>
                      <DashboardProductMatrix
                        companyId={c.id}
                        companyName={c.name}
                        departments={c.departments}
                        products={catalogProducts}
                      />
                    </div>
                  </div>
                )
              )}
              <Link
                href="/dashboard/companies"
                className="inline-block text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                View all companies →
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
                href="/dashboard/plays"
                className="mt-3 inline-block text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                Active plays →
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
              href="/dashboard/plays"
              className="mt-3 inline-block text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              View active plays →
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
