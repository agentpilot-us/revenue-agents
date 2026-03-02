import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ProductActivateButton } from '@/app/dashboard/my-company/ProductActivateButton';
import { EventActivateButton } from '@/app/dashboard/my-company/EventActivateButton';
import { MyCompanyEditor } from '@/app/dashboard/my-company/MyCompanyEditor';
import { MyCompanyDocumentsEditor } from '@/app/dashboard/my-company/MyCompanyDocumentsEditor';
import { MyCompanySheetsConfig } from '@/app/dashboard/my-company/MyCompanySheetsConfig';
import { MyCompanySheetsExportPreview } from '@/app/dashboard/my-company/MyCompanySheetsExportPreview';
import { MyCompanySignalsRefresh } from '@/app/dashboard/my-company/MyCompanySignalsRefresh';

export default async function MyCompanyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const userId = session.user.id;

  // InternalDocument may be missing from Prisma client until after `prisma generate`
  type DocRow = { id: string; title: string; description?: string | null; url?: string | null };
  const internalDoc = (prisma as { internalDocument?: { findMany: (args: unknown) => Promise<DocRow[]> } })
    .internalDocument;
  const documentsPromise: Promise<DocRow[]> = internalDoc
    ? internalDoc.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    : Promise.resolve([]);

  const [
    user,
    primaryCompany,
    companyCount,
    contactCount,
    roadmapCount,
    productCount,
    signalCount,
    documents,
    products,
    events,
    recentSignals,
  ] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          companyName: true,
          companyWebsite: true,
          companyLogoUrl: true,
          companyIndustry: true,
          primaryIndustrySellTo: true,
          updatedAt: true,
        },
      }),
      prisma.company.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          name: true,
          industry: true,
          website: true,
          keyInitiatives: true,
        },
      }),
      prisma.company.count({ where: { userId } }),
      prisma.contact.count({ where: { company: { userId } } }),
      prisma.adaptiveRoadmap.count({ where: { userId } }),
      prisma.companyProduct.count({ where: { company: { userId } } }),
      prisma.accountSignal.count({ where: { company: { userId } } }),
      documentsPromise,
      prisma.companyProduct.findMany({
        where: { company: { userId } },
        select: {
          id: true,
          status: true,
          arr: true,
          opportunitySize: true,
          company: { select: { name: true } },
          product: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.eventAttendance.findMany({
        where: {
          contact: {
            company: { userId },
          },
        },
        select: {
          eventName: true,
          eventDate: true,
          source: true,
        },
        orderBy: { eventDate: 'desc' },
        take: 10,
      }),
      prisma.accountSignal.findMany({
        where: {
          company: { userId },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          publishedAt: true,
          relevanceScore: true,
        },
      }),
    ]);

  const keyInitiatives =
    ((primaryCompany?.keyInitiatives as string[] | null) ?? []).slice(0, 5);

  const eventSummaries = events.map((e: (typeof events)[number]) => ({
    name: e.eventName,
    date: e.eventDate.toISOString().split('T')[0],
    source: e.source,
  }));

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            My Company Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Central hub for your own company data, products, and events.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)]">
        {/* Left column: intelligence + health */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Company profile
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Company name</dt>
                <dd className="text-foreground font-medium">
                  {user?.companyName ?? primaryCompany?.name ?? 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Industry</dt>
                <dd className="text-foreground">
                  {user?.companyIndustry ?? primaryCompany?.industry ?? 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd className="text-foreground">
                  {user?.companyWebsite ?? primaryCompany?.website ?? 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Primary industry you sell to</dt>
                <dd className="text-foreground">
                  {user?.primaryIndustrySellTo ?? 'Not set'}
                </dd>
              </div>
            </dl>
            {keyInitiatives.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Key initiatives
                </h3>
                <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1">
                  {keyInitiatives.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            )}
            <MyCompanyEditor
              initial={{
                companyName: user?.companyName ?? primaryCompany?.name ?? null,
                companyWebsite: user?.companyWebsite ?? primaryCompany?.website ?? null,
                companyIndustry:
                  user?.companyIndustry ?? primaryCompany?.industry ?? null,
                primaryIndustrySellTo: user?.primaryIndustrySellTo ?? null,
                keyInitiatives,
              }}
            />
          </section>

          <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Account health
            </h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Accounts</dt>
                <dd className="text-foreground font-semibold">{companyCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contacts</dt>
                <dd className="text-foreground font-semibold">{contactCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Roadmaps</dt>
                <dd className="text-foreground font-semibold">{roadmapCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Products</dt>
                <dd className="text-foreground font-semibold">{productCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Signals</dt>
                <dd className="text-foreground font-semibold">{signalCount}</dd>
              </div>
            </dl>
            <MyCompanySignalsRefresh />
          </section>
        </div>

        {/* Right column: documents, Sheets config, signals & events */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Internal documents
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No internal documents added yet. Use this space to register decks, briefs,
                and playbooks that should inform content and triggers.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{d.title}</p>
                      {d.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {d.description}
                        </p>
                      )}
                    </div>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Open
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <MyCompanyDocumentsEditor />
          </section>

          <MyCompanySheetsConfig />
          <MyCompanySheetsExportPreview />

          <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              My Company signals
            </h2>
            {recentSignals.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No signals detected yet. Refresh signals above to pull in Exa-based
                activity for your own company.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentSignals.map((s: (typeof recentSignals)[number]) => (
                  <li key={s.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {s.summary}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(s.publishedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Products & Events snapshot
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Products
                </h3>
                {products.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No products linked to accounts yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {products.map((p: (typeof products)[number]) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate">
                            {p.product.name} · {p.company.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground uppercase">
                            {p.status}
                          </p>
                        </div>
                        <ProductActivateButton productId={p.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 mt-3">
                  Recent events
                </h3>
                {eventSummaries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recent events recorded for your contacts.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {eventSummaries.map(
                      (
                        e: { name: string; date: string; source: string },
                        i: number
                      ) => (
                      <li key={`${e.name}-${i}`} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate">{e.name}</p>
                          <p className="text-[11px] text-muted-foreground">{e.date}</p>
                        </div>
                        <EventActivateButton eventName={e.name} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

