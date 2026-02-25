import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  getHotSignals,
  getNextBestActions,
  getMomentumWeekComparison,
} from '@/lib/dashboard';
import { StatusBar } from '@/app/components/dashboard/StatusBar';
import { DashboardShell } from '@/app/components/dashboard/DashboardShell';
import { ThreeColumnLayout } from '@/app/components/dashboard/ThreeColumnLayout';
import { HotSignals } from '@/app/components/dashboard/HotSignals';
import { NextBestAction } from '@/app/components/dashboard/NextBestAction';
import { TodaysTasks } from '@/app/components/dashboard/TodaysTasks';
import { AccountRadarGrid } from '@/app/components/dashboard/AccountRadarGrid';
import { MomentumThisWeek } from '@/app/components/dashboard/MomentumThisWeek';
import { PipelineBuilt } from '@/app/components/dashboard/PipelineBuilt';
import { LaunchPlays } from '@/app/components/dashboard/LaunchPlays';
import { ActivityFeed } from '@/app/components/dashboard/ActivityFeed';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ skip_content_prompt?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const params = await searchParams;
  const [contentLibraryCounts, catalogProductCount, industryPlaybookCount] =
    await Promise.all([
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
  if (contentLibraryTotal === 0 && params?.skip_content_prompt !== '1') {
    redirect('/dashboard/content-library');
  }

  const startOfThisWeek = startOfWeek(new Date());

  const [
    companiesRaw,
    campaignCounts,
    lastActivities,
    engagedThisWeekCount,
    hotSignals,
    nextBestActions,
    momentum,
    playsNeedingAction,
    dueForNextTouch,
    recentActivities,
    pipelineByCompany,
  ] = await Promise.all([
    prisma.company.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        _count: {
          select: { contacts: true, departments: true },
        },
        departments: {
          include: {
            _count: { select: { contacts: true } },
            segmentCampaigns: { select: { id: true } },
          },
        },
      },
    }),
    prisma.segmentCampaign.groupBy({
      by: ['companyId'],
      where: { company: { userId: session.user.id } },
      _count: true,
    }),
    prisma.activity.findMany({
      where: {
        company: { userId: session.user.id },
        userId: session.user.id,
      },
      select: { companyId: true, createdAt: true, type: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.activity.count({
      where: {
        userId: session.user.id,
        type: {
          in: ['Email', 'Meeting', 'EMAIL_SENT', 'EmailReply', 'EMAIL_REPLY'],
        },
        createdAt: { gte: startOfThisWeek },
      },
    }),
    getHotSignals(session.user.id),
    getNextBestActions(session.user.id),
    getMomentumWeekComparison(session.user.id),
    prisma.expansionPlay.findMany({
      where: {
        company: { userId: session.user.id },
        status: { notIn: ['WON', 'LOST'] },
        nextActionDue: { not: null },
      },
      include: {
        company: { select: { id: true, name: true } },
        companyDepartment: {
          select: { id: true, customName: true, type: true },
        },
      },
      orderBy: { nextActionDue: 'asc' },
      take: 10,
    }),
    prisma.contactSequenceEnrollment.findMany({
      where: {
        userId: session.user.id,
        status: 'active',
        nextTouchDueAt: { lte: new Date() },
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, companyId: true },
        },
        sequence: { select: { name: true } },
      },
      orderBy: { nextTouchDueAt: 'asc' },
      take: 10,
    }),
    prisma.activity.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        summary: true,
        createdAt: true,
        companyId: true,
        companyDepartmentId: true,
        contactId: true,
        company: { select: { name: true } },
      },
    }),
    prisma.companyProduct.groupBy({
      by: ['companyId'],
      where: {
        company: { userId: session.user.id },
        status: 'OPPORTUNITY',
        opportunitySize: { not: null },
      },
      _sum: { opportunitySize: true },
    }),
  ]);

  const campaignCountByCompany = new Map(
    campaignCounts.map((c) => [c.companyId, c._count])
  );
  const lastActivityByCompany = new Map<string, Date>();
  for (const a of lastActivities) {
    if (a.companyId && !lastActivityByCompany.has(a.companyId)) {
      lastActivityByCompany.set(a.companyId, a.createdAt);
    }
  }
  const companyIdsWithHotSignal = new Set(
    hotSignals.filter((s) => s.color === 'red').map((s) => s.companyId)
  );

  const companies = companiesRaw.map((c) => {
    const pagesLive = campaignCountByCompany.get(c.id) ?? 0;
    const lastActivity = lastActivityByCompany.get(c.id) ?? c.updatedAt;
    const lastActivityDate = new Date(lastActivity);
    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const hasEngagement7d = daysSinceActivity <= 7;
    const hasSignalNeedingAttention = companyIdsWithHotSignal.has(c.id);
    const coverageDenom = c.departments.length || 1;
    const coverageNumer = c.departments.filter(
      (d) => d._count.contacts > 0 || d.segmentCampaigns.length > 0
    ).length;
    const coveragePct = Math.round((coverageNumer / coverageDenom) * 100);

    let borderColor: 'green' | 'amber' | 'gray' | 'red' = 'gray';
    if (hasSignalNeedingAttention) borderColor = 'red';
    else if (pagesLive > 0 && !hasEngagement7d) borderColor = 'amber';
    else if (hasEngagement7d) borderColor = 'green';

    return {
      id: c.id,
      name: c.name,
      contactCount: c._count.contacts,
      pagesLive,
      lastActivity,
      coveragePct,
      borderColor,
      departments: c.departments.map((d) => ({
        id: d.id,
        name: d.customName ?? d.type.replace(/_/g, ' '),
        contactCount: d._count.contacts,
        hasCampaign: d.segmentCampaigns.length > 0,
      })),
    };
  });

  const totalContacts = companies.reduce((s, c) => s + c.contactCount, 0);
  const totalPages = companies.reduce((s, c) => s + c.pagesLive, 0);
  const buyingGroupsMapped = companies.reduce(
    (s, c) => s + c.departments.length,
    0
  );

  const todaysTasks = [
    ...playsNeedingAction.map((p) => ({
      id: p.id,
      label: `${p.company.name} — ${p.companyDepartment?.customName ?? p.companyDepartment?.type?.replace(/_/g, ' ') ?? 'Dept'}`,
      href: `/dashboard/companies/${p.company.id}/departments/${p.companyDepartment?.id ?? ''}`,
    })),
    ...dueForNextTouch
      .filter((e) => e.contact.companyId)
      .map((e) => ({
        id: `touch-${e.id}`,
        label: `Next touch: ${[e.contact.firstName, e.contact.lastName].filter(Boolean).join(' ').trim() || 'Contact'} (${e.sequence.name})`,
        href: `/chat?play=expansion&accountId=${e.contact.companyId}`,
      })),
  ];

  const pipelineMap = new Map(
    pipelineByCompany.map((p) => [
      p.companyId,
      Number(p._sum.opportunitySize ?? 0),
    ])
  );

  const launchPlays = nextBestActions.filter(
    (a) => a.playId && a.ctaHref.startsWith('/chat')
  );

  return (
    <DashboardShell
      statusBar={
        <StatusBar
          accountsTracked={companies.length}
          buyingGroupsMapped={buyingGroupsMapped}
          contactsFound={totalContacts}
          pagesLive={totalPages}
          engagedThisWeek={engagedThisWeekCount}
        />
      }
      activityFeed={
        <ActivityFeed
          activities={recentActivities.map((a) => ({
            id: a.id,
            type: a.type,
            summary: a.summary,
            createdAt: a.createdAt,
            companyId: a.companyId,
            companyName: a.company?.name ?? null,
            companyDepartmentId: a.companyDepartmentId,
            contactId: a.contactId,
          }))}
        />
      }
    >
      <ThreeColumnLayout
        left={
          <>
            <HotSignals signals={hotSignals} />
            <NextBestAction actions={nextBestActions} />
            <TodaysTasks tasks={todaysTasks} />
          </>
        }
        center={<AccountRadarGrid accounts={companies} />}
        right={
          <>
            <MomentumThisWeek momentum={momentum} />
            <PipelineBuilt
              companies={companies.map((c) => ({
                id: c.id,
                name: c.name,
                pipeline: pipelineMap.get(c.id) ?? 0,
              }))}
            />
            <LaunchPlays actions={launchPlays} />
          </>
        }
      />
    </DashboardShell>
  );
}
