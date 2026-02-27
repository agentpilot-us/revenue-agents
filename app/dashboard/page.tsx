import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  getHotSignals,
  getNextBestActions,
  getMomentumWeekComparison,
} from '@/lib/dashboard';
import { ensureDemoRoadmap } from '@/lib/demo/load-roadmap';
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

/** Parse estimatedOpportunity (e.g. "$50K-$150K") to { min, max } in dollars. */
function parseOpportunityRange(s: string | null): { min: number; max: number } | null {
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
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

/** Short label for department to avoid truncation. */
function deptShortName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('customer success')) return 'CS Team';
  if (n.includes('revenue operation') || n.includes('revops')) return 'RevOps';
  if (n.includes('sales')) return 'Sales';
  if (n.includes('delivery') || n.includes('implementation')) return 'Delivery';
  if (n.length <= 12) return name;
  return name;
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

  // For demo users, make sure a persona-specific AdaptiveRoadmap exists.
  await ensureDemoRoadmap(
    session.user.id,
    (session.user as { email?: string | null }).email ?? null
  );

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
    roadmap,
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
    eventCampaign,
  ] = await Promise.all([
    prisma.adaptiveRoadmap.findFirst({
      where: { userId: session.user.id },
      include: {
        targets: {
          include: {
            company: { select: { name: true } },
            companyDepartment: {
              select: { type: true, customName: true },
            },
            contacts: {
              include: {
                contact: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    engagementScore: true,
                    isResponsive: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
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
    // ExpansionPlay = tracked expansion by dept+product (status, nextActionDue). Not tactical plays (lib/plays).
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
    prisma.segmentCampaign.findFirst({
      where: {
        slug: 'celigo-connect-2026',
        company: { userId: session.user.id },
      },
      select: { id: true, companyId: true },
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
      departments: c.departments.map((d) => {
        const fullName = d.customName ?? d.type.replace(/_/g, ' ');
        return {
          id: d.id,
          name: fullName,
          shortName: deptShortName(fullName),
          contactCount: d._count.contacts,
          hasCampaign: d.segmentCampaigns.length > 0,
          estimatedOpportunity: (d as { estimatedOpportunity?: string | null }).estimatedOpportunity ?? null,
        };
      }),
    };
  });

  const totalContacts = companies.reduce((s, c) => s + c.contactCount, 0);
  const totalPages = companies.reduce((s, c) => s + c.pagesLive, 0);
  const buyingGroupsMapped = companies.reduce(
    (s, c) => s + c.departments.length,
    0
  );

  const playTasks = [
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

  const autoTasks: { id: string; label: string; href: string }[] = [];
  for (const c of companies) {
    for (const d of c.departments) {
      if (d.contactCount > 0 && !d.hasCampaign) {
        autoTasks.push({
          id: `page-${c.id}-${d.id}`,
          label: `Create sales page for ${c.name} → ${d.shortName}`,
          href: `/dashboard/companies/${c.id}/departments/${d.id}`,
        });
      }
      if (d.contactCount === 0) {
        autoTasks.push({
          id: `contacts-${c.id}-${d.id}`,
          label: `Find contacts for ${c.name} → ${d.shortName}`,
          href: `/dashboard/companies/${c.id}/departments/${d.id}`,
        });
      }
    }
    autoTasks.push({
      id: `research-${c.id}`,
      label: `Research ${c.name} buying groups`,
      href: `/dashboard/companies/${c.id}`,
    });
  }
  const eventTask = eventCampaign
    ? [
        {
          id: 'event-invite',
          label: 'Create sales page and invite users to the event',
          href: `/dashboard/companies/${eventCampaign.companyId}/create-content?playId=event_invite&signalTitle=${encodeURIComponent('Celigo CONNECT 2026 — Invitation')}`,
        },
      ]
    : [];
  const todaysTasks = [...eventTask, ...playTasks, ...autoTasks];

  const pipelineMap = new Map(
    pipelineByCompany.map((p) => [
      p.companyId,
      Number(p._sum.opportunitySize ?? 0),
    ])
  );

  const potentialByCompany = new Map<string, { min: number; max: number }>();
  for (const c of companies) {
    let minSum = 0;
    let maxSum = 0;
    for (const d of c.departments) {
      const range = parseOpportunityRange(d.estimatedOpportunity);
      if (range) {
        minSum += range.min;
        maxSum += range.max;
      }
    }
    if (minSum > 0 || maxSum > 0) potentialByCompany.set(c.id, { min: minSum, max: maxSum });
  }

  const launchPlays = nextBestActions.filter(
    (a) =>
      a.playId &&
      (a.ctaHref.startsWith('/chat') || a.ctaHref.includes('/create-content'))
  );

  // Default radar accounts based on companies/departments
  let accountsForRadar = companies.map((c) => ({
    id: c.id,
    name: c.name,
    pagesLive: c.pagesLive,
    lastActivity: c.lastActivity,
    coveragePct: c.coveragePct,
    borderColor: c.borderColor,
    departments: c.departments.map((d) => ({
      id: d.id,
      name: d.shortName,
      contactCount: d.contactCount,
      hasCampaign: d.hasCampaign,
    })),
  }));

  // When a channel_influence roadmap is present (e.g. Sercante), adapt the
  // radar to show roadmap-defined partner segments (typically Salesforce AE
  // teams) and their penetration/activity instead of generic company cards.
  if (roadmap && roadmap.roadmapType === 'channel_influence') {
    const divisionTargets = roadmap.targets.filter((t) => t.targetType === 'division');
    if (divisionTargets.length > 0) {
      accountsForRadar = divisionTargets.map((t) => {
        const totalContacts = t.contacts.length;
        const engagedContacts = t.contacts.filter((rc) => {
          if (rc.connectionStatus === 'engaged' || rc.connectionStatus === 'champion') return true;
          if (rc.relationshipStage === 'engaged' || rc.relationshipStage === 'trusted_partner')
            return true;
          const c = rc.contact;
          return !!c && (c.isResponsive || (c.engagementScore ?? 0) > 0);
        }).length;
        const coveragePct =
          totalContacts === 0 ? 0 : Math.round((engagedContacts / totalContacts) * 100);
        const name =
          t.companyDepartment?.customName ??
          t.companyDepartment?.type?.replace(/_/g, ' ') ??
          t.name;

        let borderColor: 'green' | 'amber' | 'gray' | 'red' = 'gray';
        if (coveragePct >= 60) borderColor = 'green';
        else if (coveragePct > 0) borderColor = 'amber';

        return {
          id: t.id,
          name,
          pagesLive: engagedContacts,
          lastActivity: t.lastActionAt ?? t.lastSignalAt ?? new Date(),
          coveragePct,
          borderColor,
          departments: [
            {
              id: t.id,
              name,
              contactCount: totalContacts,
              hasCampaign: engagedContacts > 0,
            },
          ],
        };
      });
    }
  }

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
          activities={
            recentActivities.length > 0
              ? recentActivities.map((a) => ({
                  id: a.id,
                  type: a.type,
                  summary: a.summary,
                  createdAt: a.createdAt,
                  companyId: a.companyId,
                  companyName: a.company?.name ?? null,
                  companyDepartmentId: a.companyDepartmentId,
                  contactId: a.contactId,
                }))
              : companies.slice(0, 8).map((c) => ({
                  id: `syn-${c.id}`,
                  type: 'Account Added',
                  summary: `Account added: ${c.name}`,
                  createdAt: typeof c.lastActivity === 'string' ? new Date(c.lastActivity) : c.lastActivity,
                  companyId: c.id,
                  companyName: c.name,
                  companyDepartmentId: null,
                  contactId: null,
                }))
          }
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
        center={
          <AccountRadarGrid accounts={accountsForRadar} />
        }
        right={
          <>
            <MomentumThisWeek momentum={momentum} />
            <PipelineBuilt
              companies={companies.map((c) => ({
                id: c.id,
                name: c.name,
                pipeline: pipelineMap.get(c.id) ?? 0,
                potential: potentialByCompany.get(c.id) ?? null,
              }))}
            />
            <LaunchPlays actions={launchPlays} />
          </>
        }
      />
    </DashboardShell>
  );
}
