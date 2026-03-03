import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { GoPageContent } from '@/app/go/GoPageContent';
import { CampaignTrack } from '@/app/go/CampaignTrack';
import { CeligoConnect2026Landing } from '@/app/go/CeligoConnect2026Landing';
import { requireLandingPageAuth } from '@/lib/auth/landing-page-middleware';

type DeptConfigItem = {
  id: string;
  name: string;
  slug?: string;
  headline?: string;
  sections?: unknown;
};
type DepartmentConfig = { departments?: DeptConfigItem[] };

async function getCampaign(slugOrId: string) {
  const campaign = await prisma.segmentCampaign.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    include: {
      company: {
        select: {
          name: true,
          domain: true,
          userId: true,
        },
      },
      department: { select: { id: true, customName: true, type: true } },
    },
  });
  if (!campaign) return null;

  // Fetch user's logo URL
  const user = await prisma.user.findUnique({
    where: { id: campaign.company.userId },
    select: { companyLogoUrl: true },
  });

  return {
    ...campaign,
    company: {
      name: campaign.company.name,
      domain: campaign.company.domain,
      userId: campaign.company.userId,
      logoUrl: user?.companyLogoUrl ?? undefined,
    },
  };
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

  const status = (campaign as { status?: string }).status;
  if (status === 'placeholder') {
    const divisionName = campaign.department?.customName ?? campaign.title?.split(' at ')[0] ?? 'This division';
    const companyName = campaign.company.name;
    const aeName = 'Your account team';
    const aeEmail = '';
    const user = await prisma.user.findUnique({
      where: { id: campaign.company.userId },
      select: { name: true, email: true, companyName: true, companyLogoUrl: true },
    });
    const aeDisplayName = user?.name ?? user?.companyName ?? 'Your account team';
    const aeDisplayEmail = user?.email ?? aeEmail;
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8 text-center">
          {user?.companyLogoUrl && (
            <img
              src={user.companyLogoUrl}
              alt={user.companyName ?? 'Company'}
              className="h-10 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {user?.companyName ?? 'We'} for {divisionName}
          </h1>
          <h2 className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">at {companyName}</h2>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            A personalized sales page for <strong>{divisionName}</strong> at{' '}
            <strong>{companyName}</strong> is being prepared by {aeDisplayName}.
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">This page will include:</p>
          <ul className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 text-left list-disc list-inside max-w-sm mx-auto">
            <li>Division-specific value story</li>
            <li>Relevant capabilities and proof points</li>
            <li>Case studies and technical overview</li>
          </ul>
          {aeDisplayEmail && (
            <p className="mt-4 text-xs text-zinc-500">
              Questions? Contact {aeDisplayName} at{' '}
              <a href={`mailto:${aeDisplayEmail}`} className="text-amber-600 dark:text-amber-400 hover:underline">
                {aeDisplayEmail}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Demo: landing page auth verification commented out so /go/... pages load without sign-in
  // const authEnabled = process.env.ENABLE_LANDING_PAGE_AUTH !== 'false';
  // const companyDomain = campaign.company.domain;
  // if (authEnabled && companyDomain) {
  //   const auth = await requireLandingPageAuth(campaign.id);
  //   if (!auth.authenticated && auth.redirect) {
  //     redirect(auth.redirect);
  //   }
  // }

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

    const deptPayload = selectedDept ? {
      id: campaign.id,
      headline: selectedDept.headline ?? campaign.headline,
      subheadline: (campaign as { subheadline?: string | null }).subheadline ?? null,
      sections: selectedDept.sections ?? (campaign as { sections?: unknown }).sections ?? null,
      ctaLabel: campaign.ctaLabel,
      ctaUrl: campaign.ctaUrl,
      url: campaign.url,
      company: { name: campaign.company.name, logoUrl: campaign.company.logoUrl },
      department: campaign.department,
    } : null;

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6 flex items-center gap-4">
            {campaign.company.logoUrl && (
              <img
                src={campaign.company.logoUrl}
                alt={campaign.company.name}
                className="h-8 w-auto object-contain"
              />
            )}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {campaign.company.name}
            </p>
          </div>
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
          {deptPayload && !showPicker ? (
            <GoPageContent campaign={deptPayload} isMultiDept />
          ) : (
            <p className="text-zinc-600 dark:text-zinc-300">Choose an area above to see content.</p>
          )}
        </div>
      </div>
    );
  }

  if (campaign.slug === 'celigo-connect-2026') {
    return (
      <CeligoConnect2026Landing
        campaignId={campaign.id}
        title={campaign.headline ?? undefined}
      />
    );
  }

  const campaignPayload = {
    id: campaign.id,
    headline: campaign.headline,
    subheadline: (campaign as { subheadline?: string | null }).subheadline ?? null,
    sections: (campaign as { sections?: unknown }).sections ?? null,
    ctaLabel: campaign.ctaLabel,
    ctaUrl: campaign.ctaUrl,
    url: campaign.url,
    company: { name: campaign.company.name, logoUrl: campaign.company.logoUrl },
    department: campaign.department,
  };

  return (
    <GoPageContent campaign={campaignPayload} />
  );
}
