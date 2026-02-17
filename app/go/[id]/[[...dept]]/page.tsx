import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CampaignChat } from '@/app/go/CampaignChat';
import { CampaignTrack } from '@/app/go/CampaignTrack';
import { requireLandingPageAuth } from '@/lib/auth/landing-page-middleware';

type PageSectionEvent = { title?: string; date?: string; description?: string; url?: string };
type PageSectionCaseStudy = { title?: string; summary?: string; link?: string };
type PageSectionSuccessStory = { title?: string; summary?: string; link?: string };
type PageSections = {
  events?: PageSectionEvent[];
  caseStudy?: PageSectionCaseStudy;
  successStory?: PageSectionSuccessStory;
};

type DeptConfigItem = {
  id: string;
  name: string;
  slug?: string;
  headline?: string;
  body?: string;
  pageSections?: PageSections | null;
};
type DepartmentConfig = { departments?: DeptConfigItem[] };

async function getCampaign(slugOrId: string) {
  const campaign = await prisma.segmentCampaign.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    include: {
      company: { select: { name: true, domain: true } },
      department: { select: { id: true, customName: true, type: true } },
    },
  });
  return campaign;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'dept';
}

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string; dept?: string[] }> };

export default async function CampaignLandingPage({ params }: Props) {
  const { id: slugOrId, dept: deptSegments } = await params;
  const deptSlug = deptSegments?.[0] ?? null;

  const campaign = await getCampaign(slugOrId);
  if (!campaign) notFound();

  // Check authentication if enabled and company has domain
  const authEnabled = process.env.ENABLE_LANDING_PAGE_AUTH !== 'false';
  const companyDomain = campaign.company.domain;

  if (authEnabled && companyDomain) {
    const auth = await requireLandingPageAuth(campaign.id);
    if (!auth.authenticated && auth.redirect) {
      redirect(auth.redirect);
    }
  }

  const isMulti = Boolean(
    (campaign as { isMultiDepartment?: boolean }).isMultiDepartment &&
    (campaign as { departmentConfig?: DepartmentConfig }).departmentConfig
  );
  const departmentConfig = (campaign as { departmentConfig?: DepartmentConfig }).departmentConfig as DepartmentConfig | null;
  const departments = departmentConfig?.departments ?? [];
  const resolvedSlug = campaign.slug === slugOrId ? campaign.slug : campaign.slug;

  if (isMulti && departments.length > 0) {
    const selectedDept = deptSlug
      ? departments.find((d) => (d.slug ?? slugify(d.name)) === deptSlug)
      : departments[0];
    const showPicker = !deptSlug || !selectedDept;

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              {campaign.company.name}
            </p>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Select your area
            </h1>
            <nav className="flex flex-wrap gap-2 mb-6" aria-label="Departments">
              {departments.map((d) => {
                const s = d.slug ?? slugify(d.name);
                const isActive = selectedDept?.id === d.id;
                const href = `/go/${resolvedSlug}/${s}`;
                return (
                  <Link
                    key={d.id}
                    href={href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {d.name}
                  </Link>
                );
              })}
            </nav>
            {selectedDept && !showPicker && (
              <>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                  {selectedDept.headline || selectedDept.name}
                </h2>
                {selectedDept.body && (
                  <div
                    className="prose prose-zinc dark:prose-invert prose-sm max-w-none mb-6"
                    dangerouslySetInnerHTML={{ __html: selectedDept.body }}
                  />
                )}
                {selectedDept.pageSections?.events && selectedDept.pageSections.events.length > 0 && (
                  <section className="mb-6">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">Upcoming events</h3>
                    <ul className="space-y-2">
                      {selectedDept.pageSections.events.map((e, i) => (
                        <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300">
                          {e.url ? (
                            <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline">
                              {e.title || 'Event'}
                            </a>
                          ) : (
                            <span className="font-medium">{e.title || 'Event'}</span>
                          )}
                          {e.date && <span className="text-zinc-500 dark:text-zinc-400 ml-2">{e.date}</span>}
                          {e.description && <p className="mt-1 text-zinc-500 dark:text-zinc-400">{e.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {selectedDept.pageSections?.caseStudy && (selectedDept.pageSections.caseStudy.title || selectedDept.pageSections.caseStudy.summary) && (
                  <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Case study</h3>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{selectedDept.pageSections.caseStudy.title}</p>
                    {selectedDept.pageSections.caseStudy.summary && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{selectedDept.pageSections.caseStudy.summary}</p>
                    )}
                    {selectedDept.pageSections.caseStudy.link && (
                      <a href={selectedDept.pageSections.caseStudy.link} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block">Read more</a>
                    )}
                  </section>
                )}
                {(campaign.ctaLabel || campaign.ctaUrl) && (
                  <div className="pt-4">
                    <a
                      href={campaign.ctaUrl || campaign.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2.5 transition-colors"
                    >
                      {campaign.ctaLabel || 'Learn more'}
                    </a>
                  </div>
                )}
              </>
            )}
            {showPicker && !selectedDept && (
              <p className="text-zinc-600 dark:text-zinc-300">Choose an area above to see content.</p>
            )}
          </div>

          <div className="mt-8">
            <CampaignChat
              campaignId={campaign.id}
              departmentId={selectedDept?.id ?? null}
            />
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
            <CampaignTrack campaignId={campaign.id} />
            <span>Powered by Agent Pilot</span>
          </div>
        </div>
      </div>
    );
  }

  const segmentName =
    campaign.department?.customName ??
    campaign.department?.type?.replace(/_/g, ' ') ??
    null;

  const sections = (campaign.pageSections ?? null) as PageSections | null;
  const hasEvents = sections?.events && sections.events.length > 0;
  const hasCaseStudy = sections?.caseStudy && (sections.caseStudy.title || sections.caseStudy.summary);
  const hasSuccessStory = sections?.successStory && (sections.successStory.title || sections.successStory.summary);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
          {segmentName && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              {campaign.company.name}
              {segmentName ? ` · ${segmentName}` : ''}
            </p>
          )}
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {campaign.headline || campaign.title}
          </h1>
          {campaign.body && (
            <div
              className="prose prose-zinc dark:prose-invert prose-sm max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: campaign.body }}
            />
          )}
          {!campaign.body && campaign.description && (
            <p className="text-zinc-600 dark:text-zinc-300 mb-6 whitespace-pre-wrap">
              {campaign.description}
            </p>
          )}
          {hasEvents && (
            <section className="mb-6">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">Upcoming events</h2>
              <ul className="space-y-2">
                {sections!.events!.map((e, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300">
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline">
                        {e.title || 'Event'}
                      </a>
                    ) : (
                      <span className="font-medium">{e.title || 'Event'}</span>
                    )}
                    {e.date && <span className="text-zinc-500 dark:text-zinc-400 ml-2">{e.date}</span>}
                    {e.description && <p className="mt-1 text-zinc-500 dark:text-zinc-400">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {hasCaseStudy && (
            <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Case study</h2>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">{sections!.caseStudy!.title}</p>
              {sections!.caseStudy!.summary && <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{sections!.caseStudy!.summary}</p>}
              {sections!.caseStudy!.link && (
                <a href={sections!.caseStudy!.link} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block">Read more</a>
              )}
            </section>
          )}
          {hasSuccessStory && (
            <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Success story</h2>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">{sections!.successStory!.title}</p>
              {sections!.successStory!.summary && <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{sections!.successStory!.summary}</p>}
              {sections!.successStory!.link && (
                <a href={sections!.successStory!.link} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block">Read more</a>
              )}
            </section>
          )}
          {(campaign.ctaLabel || campaign.ctaUrl) && (
            <div className="pt-4">
              <a
                href={campaign.ctaUrl || campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2.5 transition-colors"
              >
                {campaign.ctaLabel || 'Learn more'}
              </a>
            </div>
          )}
        </div>

        <div className="mt-8">
          <CampaignChat campaignId={campaign.id} departmentId={campaign.department?.id ?? null} />
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
          <CampaignTrack campaignId={campaign.id} />
          <span>Powered by Agent Pilot</span>
        </div>
      </div>
    </div>
  );
}
