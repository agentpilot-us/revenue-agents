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
    const focusRunId = request.nextUrl.searchParams.get('focusRun')?.trim() ?? '';
    const focusCompanyIdParam = request.nextUrl.searchParams.get('focusCompanyId')?.trim();

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

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    function runReferenceDateMs(run: RunRow): number {
      let earliest: number | null = null;
      for (const pr of run.phaseRuns) {
        for (const a of pr.actions) {
          const sd = (a as ActionRow).suggestedDate;
          if (sd) {
            const ms = new Date(sd).getTime();
            if (earliest == null || ms < earliest) earliest = ms;
          }
        }
      }
      return earliest ?? run.activatedAt.getTime();
    }
    function dayLabel(suggestedDate: Date | null, referenceMs: number): string | null {
      if (!suggestedDate) return null;
      const actionMs = new Date(suggestedDate).getTime();
      const dayOffset = Math.round((actionMs - referenceMs) / ONE_DAY_MS);
      return dayOffset >= 0 ? `Day ${dayOffset}` : null;
    }

    const allPlayRunActions: Array<{
      actionId: string;
      runId: string;
      companyId: string;
      companyName: string;
      playName: string;
      phaseName: string;
      title: string;
      status: string;
      actionType: string;
      contactName: string | null;
      contactEmail: string | null;
      dueDate: Date | null;
      suggestedDate: Date | null;
      orderKey: number;
      runStatus: string;
      triggerType: string | null;
      triggerContext: Record<string, unknown> | null;
      divisionName: string | null;
      signalRelevanceScore: number;
      activatedAt: Date;
      contentGenerationType: string | null;
      contactTitle: string | null;
      stepIndexInRun: number;
      totalStepsInRun: number;
    }> = [];

    const runIdToOrderedActionIds = new Map<string, string[]>();
    for (const run of playRuns) {
      const ids: string[] = [];
      for (const pr of run.phaseRuns) {
        for (const a of pr.actions) {
          ids.push(a.id);
        }
      }
      runIdToOrderedActionIds.set(run.id, ids);
    }

    playRuns.forEach((run) => {
      const triggerType = run.triggerType ?? null;
      const triggerContext = run.triggerContext ?? null;
      const divisionName = run.roadmapTarget?.name ?? null;
      const signalRelevanceScore = run.accountSignal?.relevanceScore ?? 0;
      const activatedAt = run.activatedAt;
      const orderedIds = runIdToOrderedActionIds.get(run.id) ?? [];
      const totalStepsInRun = orderedIds.length;
      let orderKey = 0;
      run.phaseRuns.forEach((pr) => {
        pr.actions.forEach((a: ActionRow) => {
          const ct = a.contentTemplate;
          const idx = orderedIds.indexOf(a.id);
          const stepIndexInRun = idx >= 0 ? idx + 1 : orderKey + 1;
          allPlayRunActions.push({
            actionId: a.id,
            runId: run.id,
            companyId: run.companyId,
            companyName: run.company.name,
            playName: run.playTemplate.name,
            phaseName: pr.phaseTemplate.name,
            title: a.title,
            status: a.status,
            actionType: a.actionType,
            contactName: a.contactName,
            contactEmail: a.contactEmail,
            contactTitle: a.contactTitle ?? null,
            dueDate: a.dueDate,
            suggestedDate: a.suggestedDate ?? null,
            orderKey: orderKey++,
            runStatus: run.status,
            triggerType,
            triggerContext,
            divisionName,
            signalRelevanceScore,
            activatedAt,
            contentGenerationType: ct?.contentGenerationType ?? null,
            stepIndexInRun,
            totalStepsInRun,
          });
        });
      });
    });
    const nextPlayRunSteps = allPlayRunActions.filter(
      (a) => a.status === 'PENDING' || a.status === 'REVIEWED' || a.status === 'EDITED',
    );

    function urgencyTier(dueDate: Date | null): 'Overdue' | 'Today' | 'This Week' | 'Upcoming' {
      if (!dueDate) return 'Upcoming';
      const d = new Date(dueDate);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      if (d < todayStart) return 'Overdue';
      if (d >= todayStart && d < todayEnd) return 'Today';
      const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (d < weekEnd) return 'This Week';
      return 'Upcoming';
    }
    function urgencyScore(
      step: (typeof nextPlayRunSteps)[number] & { activatedAt: Date; runStatus: string },
    ): number {
      let score = 0;
      score += (step.signalRelevanceScore ?? 0) * 2;
      const due = step.dueDate ? new Date(step.dueDate) : null;
      if (due) {
        if (due < now) score += 20;
        else {
          const sameDay =
            due.getFullYear() === now.getFullYear() &&
            due.getMonth() === now.getMonth() &&
            due.getDate() === now.getDate();
          if (sameDay) score += 10;
        }
      }
      const hoursSinceActivated = (now.getTime() - new Date(step.activatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceActivated < 24) score += 5;
      if (step.runStatus === 'PROPOSED') score += 8;
      return score;
    }
    const runIdToRefMs: Record<string, number> = {};
    playRuns.forEach((r) => {
      runIdToRefMs[r.id] = runReferenceDateMs(r);
    });
    const TIER_ORDER: Record<string, number> = {
      Overdue: 0,
      Today: 1,
      'This Week': 2,
      Upcoming: 3,
    };
    const stepsWithUrgency = nextPlayRunSteps.map((s) => {
      const dateForTier = s.suggestedDate ?? s.dueDate;
      return {
        ...s,
        urgencyTier: urgencyTier(dateForTier),
        dayLabel: dayLabel(s.suggestedDate, runIdToRefMs[s.runId] ?? s.activatedAt.getTime()),
        urgencyScore: urgencyScore(s),
      };
    });
    stepsWithUrgency.sort((a, b) => {
      const tierA = TIER_ORDER[a.urgencyTier] ?? 4;
      const tierB = TIER_ORDER[b.urgencyTier] ?? 4;
      if (tierA !== tierB) return tierA - tierB;
      const dateA = a.suggestedDate ? new Date(a.suggestedDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.suggestedDate ? new Date(b.suggestedDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (dateA !== dateB) return dateA - dateB;
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      return a.runId.localeCompare(b.runId);
    });
    const cappedSteps = stepsWithUrgency.slice(0, 20);

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

    function whyNow(step: (typeof cappedSteps)[number]): string | null {
      if (step.runStatus === 'PROPOSED') return 'Review suggested plan';
      const ctx = step.triggerContext;
      if (ctx?.signalSummary && typeof ctx.signalSummary === 'string') return ctx.signalSummary;
      if (ctx?.signalTitle && typeof ctx.signalTitle === 'string') return ctx.signalTitle;
      if (ctx?.objectiveText && typeof ctx.objectiveText === 'string') return ctx.objectiveText;
      if (step.triggerType === 'TIMER' && ctx?.renewalDays != null) return `Renewal in ${ctx.renewalDays} days`;
      if (step.triggerType === 'SIGNAL') return 'Signal detected';
      if (step.triggerType === 'OBJECTIVE') return 'Objective-driven play';
      return null;
    }

    let followUpStepsFromPlayRuns = cappedSteps.map((a) => ({
      id: a.actionId,
      stepOrder: a.stepIndexInRun,
      stepType: a.actionType,
      contentType: a.actionType === 'SEND_EMAIL' ? 'email' : null,
      channel: a.actionType === 'SEND_EMAIL' ? 'email' : null,
      promptHint: a.title,
      dueAt: a.dueDate ? new Date(a.dueDate).toISOString() : null,
      suggestedDate: a.suggestedDate ? new Date(a.suggestedDate).toISOString() : null,
      dayLabel: a.dayLabel ?? null,
      status: a.status,
      contact: a.contactName
        ? {
            id: '',
            firstName: a.contactName.split(' ')[0] ?? null,
            lastName: a.contactName.split(' ').slice(1).join(' ') || null,
            title: (a as { contactTitle?: string | null }).contactTitle ?? null,
          }
        : null,
      division: a.divisionName ? { id: '', customName: a.divisionName, type: '' } : null,
      workflowId: '',
      workflowTitle: a.playName,
      companyId: a.companyId,
      companyName: a.companyName,
      templateName: a.playName,
      signalTitle: null,
      source: 'play_run' as const,
      runId: a.runId,
      whyNow: whyNow(a),
      divisionName: a.divisionName,
      contentGenerationType: a.contentGenerationType,
      urgencyTier: a.urgencyTier,
      runStatus: a.runStatus,
      totalSteps: a.totalStepsInRun,
      completedSteps: Math.max(0, a.stepIndexInRun - 1),
    }));

    // Client may pass ?focusRun= after starting a play. The Continue queue is capped at 20 after
    // urgency sort; the new run can be missing. Load that run's first open step and prepend it,
    // dedupe by action id, then keep at most 21 rows (drop from the end) so the focused row stays first.
    if (focusRunId && !followUpStepsFromPlayRuns.some((s) => s.runId === focusRunId)) {
      const fr = await prisma.playRun.findFirst({
        where: {
          id: focusRunId,
          userId,
          ...(focusCompanyIdParam ? { companyId: focusCompanyIdParam } : {}),
          status: { in: ['ACTIVE', 'PROPOSED', 'PAUSED'] },
        },
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
      });

      if (fr) {
        const sortedPhases = [...fr.phaseRuns].sort(
          (a, b) => a.phaseTemplate.orderIndex - b.phaseTemplate.orderIndex,
        );
        type FocusActionRow = (typeof sortedPhases)[number]['actions'][number];
        let pickedAction: FocusActionRow | null = null;
        let pickedPhase: (typeof sortedPhases)[number] | null = null;
        for (const pr of sortedPhases) {
          for (const act of pr.actions) {
            if (act.status === 'PENDING' || act.status === 'REVIEWED' || act.status === 'EDITED') {
              pickedAction = act;
              pickedPhase = pr;
              break;
            }
          }
          if (pickedAction) break;
        }

        if (pickedAction && pickedPhase) {
          const orderedIds: string[] = [];
          for (const pr of sortedPhases) {
            for (const act of pr.actions) {
              orderedIds.push(act.id);
            }
          }
          const runRow: RunRow = {
            id: fr.id,
            companyId: fr.companyId,
            status: fr.status,
            activatedAt: fr.activatedAt,
            phaseRuns: sortedPhases as PhaseRunRow[],
            company: fr.company,
            playTemplate: fr.playTemplate,
            roadmapTarget: fr.roadmapTarget,
            accountSignal: fr.accountSignal,
            triggerType: fr.triggerType ?? null,
            triggerContext: (fr.triggerContext as Record<string, unknown> | null) ?? null,
          };
          const refMs = runReferenceDateMs(runRow);
          const triggerType = fr.triggerType ?? null;
          const triggerContext = (fr.triggerContext as Record<string, unknown> | null) ?? null;
          const divisionName = fr.roadmapTarget?.name ?? null;
          const signalRelevanceScore = fr.accountSignal?.relevanceScore ?? 0;
          const idx = orderedIds.indexOf(pickedAction.id);
          const totalStepsInRun = orderedIds.length;
          const stepIndexInRun = idx >= 0 ? idx + 1 : 1;
          const ct = pickedAction.contentTemplate;
          const flatForUrgency = {
            actionId: pickedAction.id,
            runId: fr.id,
            companyId: fr.companyId,
            companyName: fr.company.name,
            playName: fr.playTemplate.name,
            phaseName: pickedPhase.phaseTemplate.name,
            title: pickedAction.title,
            status: pickedAction.status,
            actionType: pickedAction.actionType,
            contactName: pickedAction.contactName,
            contactEmail: pickedAction.contactEmail,
            contactTitle: pickedAction.contactTitle ?? null,
            dueDate: pickedAction.dueDate,
            suggestedDate: pickedAction.suggestedDate ?? null,
            orderKey: 0,
            runStatus: fr.status,
            triggerType,
            triggerContext,
            divisionName,
            signalRelevanceScore,
            activatedAt: fr.activatedAt,
            contentGenerationType: ct?.contentGenerationType ?? null,
            stepIndexInRun,
            totalStepsInRun,
          };
          const dateForTier = flatForUrgency.suggestedDate ?? flatForUrgency.dueDate;
          const cappedLike = {
            ...flatForUrgency,
            urgencyTier: urgencyTier(dateForTier),
            dayLabel: dayLabel(pickedAction.suggestedDate, refMs),
            urgencyScore: urgencyScore(flatForUrgency),
          };

          if (!followUpStepsFromPlayRuns.some((s) => s.id === cappedLike.actionId)) {
            const prepended = {
              id: cappedLike.actionId,
              stepOrder: cappedLike.stepIndexInRun,
              stepType: cappedLike.actionType,
              contentType: cappedLike.actionType === 'SEND_EMAIL' ? 'email' : null,
              channel: cappedLike.actionType === 'SEND_EMAIL' ? 'email' : null,
              promptHint: cappedLike.title,
              dueAt: cappedLike.dueDate ? new Date(cappedLike.dueDate).toISOString() : null,
              suggestedDate: cappedLike.suggestedDate
                ? new Date(cappedLike.suggestedDate).toISOString()
                : null,
              dayLabel: cappedLike.dayLabel ?? null,
              status: cappedLike.status,
              contact: cappedLike.contactName
                ? {
                    id: '',
                    firstName: cappedLike.contactName.split(' ')[0] ?? null,
                    lastName: cappedLike.contactName.split(' ').slice(1).join(' ') || null,
                    title: cappedLike.contactTitle ?? null,
                  }
                : null,
              division: cappedLike.divisionName
                ? { id: '', customName: cappedLike.divisionName, type: '' }
                : null,
              workflowId: '',
              workflowTitle: cappedLike.playName,
              companyId: cappedLike.companyId,
              companyName: cappedLike.companyName,
              templateName: cappedLike.playName,
              signalTitle: null,
              source: 'play_run' as const,
              runId: cappedLike.runId,
              whyNow: whyNow(cappedLike),
              divisionName: cappedLike.divisionName,
              contentGenerationType: cappedLike.contentGenerationType,
              urgencyTier: cappedLike.urgencyTier,
              runStatus: cappedLike.runStatus,
              totalSteps: cappedLike.totalStepsInRun,
              completedSteps: Math.max(0, cappedLike.stepIndexInRun - 1),
            };
            followUpStepsFromPlayRuns = [prepended, ...followUpStepsFromPlayRuns].slice(0, 21);
          }
        }
      }
    }

    // Sequence follow-ups: enrollments with next touch due in next 24h
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sequenceEnrollments = await prisma.contactSequenceEnrollment.findMany({
      where: {
        userId,
        status: 'active',
        nextTouchDueAt: { lte: twentyFourHoursFromNow, not: null },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            companyId: true,
            company: { select: { id: true, name: true } },
          },
        },
        sequence: { select: { id: true, name: true } },
      },
      orderBy: { nextTouchDueAt: 'asc' },
      take: 20,
    });
    const sequenceFollowUps = sequenceEnrollments.map((e, i) => ({
      id: e.id,
      stepOrder: i + 1,
      stepType: 'sequence',
      contentType: 'email' as string | null,
      channel: 'email' as string | null,
      promptHint: `Next touch: ${e.sequence.name}`,
      dueAt: e.nextTouchDueAt?.toISOString() ?? null,
      status: 'PENDING',
      contact: e.contact
        ? {
            id: e.contact.id,
            firstName: e.contact.firstName,
            lastName: e.contact.lastName,
            title: e.contact.title,
          }
        : null,
      division: null,
      workflowId: e.sequenceId,
      workflowTitle: e.sequence.name,
      companyId: e.contact.companyId,
      companyName: e.contact.company.name,
      templateName: e.sequence.name,
      signalTitle: null,
      source: 'sequence' as const,
      runId: e.id,
    }));

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
      followUpStepsFromPlayRuns,
      sequenceFollowUps,
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
