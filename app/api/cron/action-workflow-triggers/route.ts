import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';
import { createEngagementWorkflow } from '@/lib/plays/engagement-trigger';

/**
 * Cron: runs every 15-60 minutes.
 * Two jobs:
 *   1. Meeting Prep — finds meetings/events within 24h and creates PlayRuns
 *   2. Engagement Catch-All — finds recent high-value visits and creates PlayRuns via createEngagementWorkflow
 *
 * Secure with CRON_SECRET (Bearer token in Authorization header).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [meetingPrepCount, engagementCount] = await Promise.all([
      createMeetingPrepWorkflows(now, in24h),
      createEngagementCatchAll(oneHourAgo, now),
    ]);

    return NextResponse.json({
      ok: true,
      meetingPrepCreated: meetingPrepCount,
      engagementCreated: engagementCount,
    });
  } catch (error) {
    console.error('[cron/action-workflow-triggers]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Meeting Prep: scan for upcoming meetings and events within 24 hours
// ---------------------------------------------------------------------------

async function createMeetingPrepWorkflows(now: Date, horizon: Date): Promise<number> {
  let created = 0;

  // 1. Activity records with type MEETING_SCHEDULED that have a future calEventId
  //    We look for meetings where metadata.meetingDate is within 24h
  const upcomingMeetings = await prisma.activity.findMany({
    where: {
      type: { in: ['MEETING_SCHEDULED', 'Meeting'] },
      metadata: { not: undefined },
      createdAt: { lte: now },
    },
    select: {
      id: true,
      userId: true,
      companyId: true,
      contactId: true,
      companyDepartmentId: true,
      summary: true,
      metadata: true,
      contact: { select: { firstName: true, lastName: true, title: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  for (const meeting of upcomingMeetings) {
    const meta = meeting.metadata as Record<string, unknown> | null;
    const meetingDateRaw = meta?.meetingDate ?? meta?.scheduledAt ?? meta?.date;
    if (!meetingDateRaw) continue;

    const meetingDate = new Date(meetingDateRaw as string);
    if (isNaN(meetingDate.getTime())) continue;
    if (meetingDate < now || meetingDate > horizon) continue;

    const contactName = meeting.contact
      ? `${meeting.contact.firstName ?? ''} ${meeting.contact.lastName ?? ''}`.trim()
      : null;
    const companyName = meeting.company?.name ?? 'Unknown';
    const hoursUntil = Math.round((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const title = `Meeting Prep: ${contactName || companyName} in ${hoursUntil}h`;

    const existingSignal = await prisma.accountSignal.findFirst({
      where: {
        userId: meeting.userId,
        companyId: meeting.companyId,
        type: 'internal_meeting_prep',
        metadata: { path: ['meetingActivityId'], equals: meeting.id },
      },
      select: { id: true },
    });
    if (existingSignal) {
      const existingRun = await prisma.playRun.findFirst({
        where: { accountSignalId: existingSignal.id },
        select: { id: true },
      });
      if (existingRun) continue;
    }

    const signal = existingSignal ?? await prisma.accountSignal.create({
      data: {
        userId: meeting.userId,
        companyId: meeting.companyId,
        type: 'internal_meeting_prep',
        title,
        summary: meeting.summary ?? '',
        url: '',
        publishedAt: new Date(),
        relevanceScore: 7,
        metadata: { meetingActivityId: meeting.id } as object,
      },
      select: { id: true },
    });

    const template = await prisma.playTemplate.findFirst({
      where: { userId: meeting.userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (template) {
      await createPlayRunFromTemplate({
        userId: meeting.userId,
        companyId: meeting.companyId,
        playTemplateId: template.id,
        accountSignalId: signal.id,
        title,
      });
      created++;
    }
  }

  // 2. EventAttendance records where eventDate is within 24h
  const upcomingEvents = await prisma.eventAttendance.findMany({
    where: {
      eventDate: { gte: now, lte: horizon },
    },
    select: {
      id: true,
      contactId: true,
      eventName: true,
      eventDate: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          companyId: true,
          companyDepartmentId: true,
          company: { select: { name: true, userId: true } },
        },
      },
    },
  });

  for (const event of upcomingEvents) {
    const contact = event.contact;
    if (!contact?.company) continue;

    const contactName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || 'Attendee';
    const hoursUntil = Math.round((event.eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const title = `Event Prep: ${contactName} attending ${event.eventName}`;

    const existingSignal = await prisma.accountSignal.findFirst({
      where: {
        userId: contact.company.userId,
        companyId: contact.companyId,
        type: 'internal_event_prep',
        metadata: { path: ['eventAttendanceId'], equals: event.id },
      },
      select: { id: true },
    });
    if (existingSignal) {
      const existingRun = await prisma.playRun.findFirst({
        where: { accountSignalId: existingSignal.id },
        select: { id: true },
      });
      if (existingRun) continue;
    }

    const signal = existingSignal ?? await prisma.accountSignal.create({
      data: {
        userId: contact.company.userId,
        companyId: contact.companyId,
        type: 'internal_event_prep',
        title,
        summary: `${contactName} at ${contact.company.name} attending ${event.eventName} in ${hoursUntil}h`,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 7,
        metadata: { eventAttendanceId: event.id } as object,
      },
      select: { id: true },
    });

    const template = await prisma.playTemplate.findFirst({
      where: { userId: contact.company.userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (template) {
      await createPlayRunFromTemplate({
        userId: contact.company.userId,
        companyId: contact.companyId,
        playTemplateId: template.id,
        accountSignalId: signal.id,
        title,
      });
      created++;
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Engagement Catch-All: find recent high-value visits without workflows
// ---------------------------------------------------------------------------

const HIGH_VALUE_ALERT_TYPES = [
  'HIGH_VALUE_VISITOR',
  'EXECUTIVE_VISIT',
  'FORM_SUBMISSION',
  'CTA_CLICKED',
  'MULTIPLE_CHAT_MESSAGES',
];

async function createEngagementCatchAll(since: Date, now: Date): Promise<number> {
  let created = 0;

  const recentAlerts = await prisma.alert.findMany({
    where: {
      type: { in: HIGH_VALUE_ALERT_TYPES as never[] },
      createdAt: { gte: since, lte: now },
      visitId: { not: null },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      data: true,
      visitId: true,
      visit: {
        select: {
          id: true,
          visitorName: true,
          visitorEmail: true,
          visitorJobTitle: true,
          departmentId: true,
          campaign: {
            select: {
              companyId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  for (const alert of recentAlerts) {
    const visit = alert.visit;
    if (!visit?.campaign) continue;

    try {
      const wfId = await createEngagementWorkflow({
        userId: alert.userId,
        companyId: visit.campaign.companyId,
        visitId: visit.id,
        alertType: alert.type,
        visitorName: visit.visitorName,
        visitorEmail: visit.visitorEmail,
        visitorTitle: visit.visitorJobTitle,
        campaignName: visit.campaign.title ?? 'Landing page',
        departmentId: visit.departmentId,
      });
      if (wfId) created++;
    } catch (err) {
      console.error(`[cron] engagement catch-all failed for alert ${alert.id}:`, err);
    }
  }

  return created;
}
