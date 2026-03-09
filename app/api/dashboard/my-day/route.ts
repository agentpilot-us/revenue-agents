import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getMomentumWeekComparison } from '@/lib/dashboard/momentum';
import { getNextBestPlays } from '@/lib/dashboard/next-best-plays';
import { ContentType } from '@prisma/client';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const now = new Date();

    const [workflows, companies, momentum, recentActivities, hotSignalsRaw, companyEvents, catalogProducts, followUpStepsRaw] =
      await Promise.all([
        prisma.actionWorkflow.findMany({
          where: {
            userId,
            status: { in: ['pending', 'in_progress', 'snoozed', 'active'] },
            OR: [
              { snoozeUntil: null },
              { snoozeUntil: { lte: new Date() } },
            ],
          },
          include: {
            company: {
              select: { id: true, name: true, industry: true, domain: true },
            },
            campaign: { select: { id: true, name: true, motion: true, status: true, phase: true } },
            template: { select: { id: true, name: true, triggerType: true } },
            accountSignal: { select: { id: true, title: true, type: true } },
            targetDivision: {
              select: { id: true, customName: true, type: true },
            },
            targetContact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true,
              },
            },
            steps: {
              orderBy: { stepOrder: 'asc' },
              select: {
                id: true,
                status: true,
                stepType: true,
                promptHint: true,
                contentType: true,
                channel: true,
                dueAt: true,
                contact: {
                  select: { id: true, firstName: true, lastName: true, title: true },
                },
              },
            },
          },
          orderBy: [{ urgencyScore: 'desc' }, { createdAt: 'desc' }],
          take: 30,
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
            actionWorkflows: {
              where: { status: { in: ['pending', 'in_progress'] } },
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

        // Hot signals: relevance >= 7, new, last 7 days
        prisma.accountSignal.findMany({
          where: {
            userId,
            status: 'new',
            relevanceScore: { gte: 4 },
            publishedAt: { gte: sevenDaysAgo },
          },
          orderBy: [{ relevanceScore: 'desc' }, { publishedAt: 'desc' }],
          take: 30,
          select: {
            id: true,
            companyId: true,
            type: true,
            title: true,
            summary: true,
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

        // Recently updated catalog products (last 7 days)
        prisma.catalogProduct.findMany({
          where: {
            userId,
            updatedAt: { gte: sevenDaysAgo },
          },
          take: 10,
          select: {
            id: true,
            name: true,
            description: true,
            targetDepartments: true,
            contentTags: true,
            updatedAt: true,
          },
        }),

        // Follow-up steps: pending steps whose dueAt has arrived
        prisma.actionWorkflowStep.findMany({
          where: {
            status: 'pending',
            dueAt: { lte: now },
            workflow: {
              userId,
              status: { in: ['in_progress'] },
            },
          },
          orderBy: { dueAt: 'asc' },
          take: 20,
          select: {
            id: true,
            stepOrder: true,
            stepType: true,
            contentType: true,
            channel: true,
            promptHint: true,
            dueAt: true,
            status: true,
            contact: {
              select: { id: true, firstName: true, lastName: true, title: true },
            },
            division: {
              select: { id: true, customName: true, type: true },
            },
            workflow: {
              select: {
                id: true,
                title: true,
                companyId: true,
                company: { select: { id: true, name: true } },
                template: { select: { id: true, name: true } },
                accountSignal: { select: { title: true } },
              },
            },
          },
        }),
      ]);

    const accountHealth = companies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      contactCount: c._count.contacts,
      departmentCount: c._count.departments,
      openActions: c.actionWorkflows.length,
      health:
        c.actionWorkflows.length > 3
          ? 'red'
          : c.actionWorkflows.length > 1
            ? 'yellow'
            : 'green',
      departments: c.departments.map((d) => ({
        id: d.id,
        type: d.type,
        customName: d.customName,
        contactCount: d._count.contacts,
      })),
    }));

    // Build hot signals with division resolution
    const hotSignals = hotSignalsRaw.map((s) => ({
      id: s.id,
      companyId: s.companyId,
      companyName: s.company.name,
      type: s.type,
      title: s.title,
      summary: s.summary,
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

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (const product of catalogProducts) {
      if (product.updatedAt > sevenDaysFromNow) continue;

      const deptTags = (product.targetDepartments ?? []).map(String);
      const matching = findMatchingAccounts(companies, deptTags, null);

      companyTriggers.push({
        id: product.id,
        kind: 'product',
        title: `Product Update: ${product.name}`,
        description: product.description,
        eventDate: null,
        daysUntil: null,
        departmentTags: deptTags,
        industryTag: null,
        matchingAccounts: matching,
      });
    }

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

    // Shape follow-up steps for the client
    const followUpSteps = followUpStepsRaw.map((step) => ({
      id: step.id,
      stepOrder: step.stepOrder,
      stepType: step.stepType,
      contentType: step.contentType,
      channel: step.channel,
      promptHint: step.promptHint,
      dueAt: step.dueAt,
      status: step.status,
      contact: step.contact,
      division: step.division,
      workflowId: step.workflow.id,
      workflowTitle: step.workflow.title,
      companyId: step.workflow.companyId,
      companyName: step.workflow.company?.name ?? 'Unknown',
      templateName: step.workflow.template?.name ?? null,
      signalTitle: step.workflow.accountSignal?.title ?? null,
    }));

    return NextResponse.json({
      workflows,
      accountHealth,
      momentum,
      recentActivities,
      hotSignals,
      companyTriggers,
      recommendedPlays,
      followUpSteps,
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
