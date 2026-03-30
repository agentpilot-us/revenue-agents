import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getMomentumWeekComparison } from '@/lib/dashboard/momentum';
import { getNextBestPlays } from '@/lib/dashboard/next-best-plays';
import { ContentType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const now = new Date();

    const [
      playRunsRaw,
      companies,
      momentum,
      recentActivities,
      hotSignalsRaw,
      companyEvents,
    ] = await Promise.all([
        prisma.playRun.findMany({
          where: { userId, status: { in: ['ACTIVE', 'PROPOSED'] } },
          include: {
            company: { select: { id: true, name: true, industry: true } },
            playTemplate: { select: { id: true, name: true, slug: true } },
            roadmapTarget: { select: { id: true, name: true } },
            accountSignal: { select: { id: true, title: true, summary: true, relevanceScore: true } },
            phaseRuns: {
              include: {
                phaseTemplate: { select: { id: true, name: true, orderIndex: true } },
                actions: {
                  orderBy: [{ suggestedDate: 'asc' }, { createdAt: 'asc' }],
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    actionType: true,
                    contactName: true,
                    contactEmail: true,
                    contactTitle: true,
                    generatedContent: true,
                    generatedSubject: true,
                    cooldownWarning: true,
                    alternateContact: true,
                    dueDate: true,
                    suggestedDate: true,
                    contentTemplate: {
                      select: {
                        id: true,
                        name: true,
                        contentType: true,
                        channel: true,
                        contentGenerationType: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { activatedAt: 'desc' },
          take: 50,
        }),

        prisma.company.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            name: true,
            domain: true,
            industry: true,
            _count: { select: { contacts: true, departments: true } },
            departments: {
              select: {
                id: true,
                type: true,
                customName: true,
                _count: { select: { contacts: true } },
              },
            },
            playRuns: {
              where: { status: 'ACTIVE' },
              select: { id: true },
            },
          },
        }),

        getMomentumWeekComparison(userId),

        prisma.activity.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true,
            type: true,
            summary: true,
            createdAt: true,
            companyId: true,
            company: { select: { name: true } },
          },
        }),

        // Hot signals: relevance >= 4, new, last 7 days (exclude "Product Update:" — own catalog noise)
        prisma.accountSignal.findMany({
          where: {
            userId,
            status: 'new',
            relevanceScore: { gte: 4 },
            publishedAt: { gte: sevenDaysAgo },
            title: { not: { startsWith: 'Product Update:' } },
          },
          orderBy: [{ relevanceScore: 'desc' }, { publishedAt: 'desc' }],
          take: 30,
          select: {
            id: true,
            companyId: true,
            type: true,
            title: true,
            summary: true,
            url: true,
            publishedAt: true,
            relevanceScore: true,
            suggestedPlay: true,
            status: true,
            company: { select: { id: true, name: true, industry: true } },
          },
        }),

        // Company events within next 30 days
        prisma.contentLibrary.findMany({
          where: {
            userId,
            type: ContentType.CompanyEvent,
            isActive: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            content: true,
            department: true,
            industry: true,
            inferredTags: true,
            createdAt: true,
          },
        }),
      ]);

    type ActionRow = {
      id: string;
      title: string;
      status: string;
      actionType: string;
      contactName: string | null;
      contactEmail: string | null;
      contactTitle: string | null;
      dueDate: Date | null;
      suggestedDate: Date | null;
      contentTemplate: { contentGenerationType?: string } | null;
    };
    type PhaseRunRow = {
      phaseTemplate: { name: string; orderIndex: number };
      actions: ActionRow[];
    };
    type RunRow = {
      id: string;
      companyId: string;
      status: string;
      activatedAt: Date;
      phaseRuns: PhaseRunRow[];
      company: { name: string };
      playTemplate: { name: string };
      roadmapTarget?: { name: string } | null;
      accountSignal?: { relevanceScore: number | null } | null;
      triggerType?: string | null;
      triggerContext?: Record<string, unknown> | null;
    };
    const playRuns = ((playRunsRaw as unknown) as RunRow[]).map((run) => {
      const sortedPhases = [...run.phaseRuns].sort(
        (a, b) => a.phaseTemplate.orderIndex - b.phaseTemplate.orderIndex,
      );
      return { ...run, phaseRuns: sortedPhases };
    });

    const accountHealth = companies.map((c) => {
      const openCount = (c as { playRuns?: { id: string }[] }).playRuns?.length ?? 0;
      return {
        id: c.id,
        name: c.name,
        domain: c.domain,
        industry: c.industry,
        contactCount: c._count.contacts,
        departmentCount: c._count.departments,
        openActions: openCount,
        health:
          openCount > 3 ? 'red' : openCount > 1 ? 'yellow' : 'green',
        departments: c.departments.map((d) => ({
          id: d.id,
          type: d.type,
          customName: d.customName,
          contactCount: d._count.contacts,
        })),
      };
    });

    // Build hot signals with division resolution
    const hotSignals = hotSignalsRaw.map((s) => ({
      id: s.id,
      companyId: s.companyId,
      companyName: s.company.name,
      type: s.type,
      title: s.title,
      summary: s.summary,
      url: s.url,
      publishedAt: s.publishedAt,
      relevanceScore: s.relevanceScore,
      suggestedPlay: s.suggestedPlay,
    }));

    // Build company triggers with matching accounts
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const companyTriggers: Array<{
      id: string;
      kind: 'event' | 'product';
      title: string;
      description: string | null;
      eventDate: string | null;
      daysUntil: number | null;
      departmentTags: string[];
      industryTag: string | null;
      matchingAccounts: Array<{
        companyId: string;
        companyName: string;
        divisions: Array<{ id: string; name: string; contactCount: number }>;
      }>;
    }> = [];

    for (const event of companyEvents) {
      const content = event.content as Record<string, unknown> | null;
      const eventDateRaw = content?.date ?? content?.eventDate ?? content?.startDate;
      let eventDate: Date | null = null;
      if (eventDateRaw) {
        eventDate = new Date(eventDateRaw as string);
        if (isNaN(eventDate.getTime())) eventDate = null;
      }
      if (eventDate && (eventDate < now || eventDate > thirtyDaysFromNow)) continue;

      const daysUntil = eventDate
        ? Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const deptTags: string[] = [];
      if (event.department) deptTags.push(event.department);
      const tags = event.inferredTags as Record<string, unknown> | null;
      if (tags?.departments && Array.isArray(tags.departments)) {
        deptTags.push(...(tags.departments as string[]));
      }
      const industryTag = event.industry ?? (tags?.industry as string | undefined) ?? null;

      const matching = findMatchingAccounts(companies, deptTags, industryTag);

      companyTriggers.push({
        id: event.id,
        kind: 'event',
        title: event.title,
        description: typeof content?.description === 'string' ? content.description : null,
        eventDate: eventDate?.toISOString() ?? null,
        daysUntil,
        departmentTags: deptTags,
        industryTag,
        matchingAccounts: matching,
      });
    }

    // Catalog product updates are not added to companyTriggers so My Day stays focused on account signals
    // (exec_hire, earnings_beat, competitor_detected) instead of "YOUR COMPANY" product cards.

    // Recommended next-best-plays across top accounts (parallel, capped)
    const topAccountIds = companies.slice(0, 5).map((c) => c.id);
    const companyNameMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));
    const perAccount = await Promise.all(
      topAccountIds.map(async (cid) => {
        const plays = await getNextBestPlays(userId, cid, 3).catch(() => []);
        return plays.map((rec) => ({
          ...rec,
          companyId: cid,
          companyName: companyNameMap[cid] ?? 'Unknown',
        }));
      }),
    );
    const recommendedPlays = perAccount
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return NextResponse.json({
      workflows: [],
      playRuns,
      accountHealth,
      momentum,
      recentActivities,
      hotSignals,
      companyTriggers,
      recommendedPlays,
      followUpSteps: [],
    });
  } catch (error) {
    console.error('GET /api/dashboard/my-day error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}

type CompanyWithDepts = {
  id: string;
  name: string;
  industry: string | null;
  departments: Array<{
    id: string;
    type: string;
    customName: string | null;
    _count: { contacts: number };
  }>;
};

function findMatchingAccounts(
  companies: CompanyWithDepts[],
  departmentTags: string[],
  industryTag: string | null,
): Array<{ companyId: string; companyName: string; divisions: Array<{ id: string; name: string; contactCount: number }> }> {
  const results: Array<{ companyId: string; companyName: string; divisions: Array<{ id: string; name: string; contactCount: number }> }> = [];
  const deptTagsLower = departmentTags.map((t) => t.toLowerCase());

  for (const company of companies) {
    if (industryTag && company.industry) {
      const industryMatch = company.industry.toLowerCase().includes(industryTag.toLowerCase())
        || industryTag.toLowerCase().includes(company.industry.toLowerCase());
      if (!industryMatch && deptTagsLower.length === 0) continue;
    }

    const matchedDivisions: Array<{ id: string; name: string; contactCount: number }> = [];
    for (const dept of company.departments) {
      const deptTypeLower = dept.type.toLowerCase();
      const deptNameLower = (dept.customName ?? dept.type).toLowerCase().replace(/_/g, ' ');
      const deptMatch = deptTagsLower.some(
        (tag) => deptTypeLower.includes(tag) || tag.includes(deptTypeLower)
          || deptNameLower.includes(tag) || tag.includes(deptNameLower)
      );
      if (deptMatch && dept._count.contacts > 0) {
        matchedDivisions.push({
          id: dept.id,
          name: dept.customName ?? dept.type.replace(/_/g, ' '),
          contactCount: dept._count.contacts,
        });
      }
    }

    if (matchedDivisions.length > 0) {
      results.push({
        companyId: company.id,
        companyName: company.name,
        divisions: matchedDivisions,
      });
    }
  }

  return results;
}
