import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createEngagementWorkflow } from '@/lib/action-workflows/engagement-trigger';

/**
 * Cron: runs every 15-60 minutes.
 * Two jobs:
 *   1. Meeting Prep — finds meetings/events within 24h and creates prep workflows
 *   2. Engagement Catch-All — finds recent high-value visits without workflows
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

    // Dedup: check if a meeting prep workflow already exists
    const existing = await prisma.actionWorkflow.findFirst({
      where: {
        userId: meeting.userId,
        companyId: meeting.companyId,
        accountContext: { path: ['meetingActivityId'], equals: meeting.id },
      },
      select: { id: true },
    });
    if (existing) continue;

    const contactName = meeting.contact
      ? `${meeting.contact.firstName ?? ''} ${meeting.contact.lastName ?? ''}`.trim()
      : null;
    const companyName = meeting.company?.name ?? 'Unknown';
    const hoursUntil = Math.round((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    await prisma.actionWorkflow.create({
      data: {
        userId: meeting.userId,
        companyId: meeting.companyId,
        targetContactId: meeting.contactId || undefined,
        targetDivisionId: meeting.companyDepartmentId || undefined,
        title: `Meeting Prep: ${contactName || companyName} in ${hoursUntil}h`,
        description: meeting.summary,
        status: 'pending',
        urgencyScore: hoursUntil <= 4 ? 180 : hoursUntil <= 12 ? 160 : 140,
        signalContext: {
          source: 'meeting_prep',
          meetingDate: meetingDate.toISOString(),
          hoursUntil,
          contactName,
          contactTitle: meeting.contact?.title,
        },
        accountContext: {
          meetingActivityId: meeting.id,
          companyName,
          triggerType: 'meeting_prep',
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              stepType: 'generate_content',
              contentType: 'talking_points',
              channel: 'task',
              contactId: meeting.contactId || undefined,
              divisionId: meeting.companyDepartmentId || undefined,
              promptHint: `Prepare a meeting brief for ${contactName || 'this contact'} at ${companyName}. Include: their role and likely priorities, recent signals or news about the company, relevant product fit, active objections to address, and 3-5 suggested talking points. The meeting is in ${hoursUntil} hours.`,
              status: 'pending',
            },
            {
              stepOrder: 2,
              stepType: 'generate_content',
              contentType: 'talking_points',
              channel: 'task',
              contactId: meeting.contactId || undefined,
              divisionId: meeting.companyDepartmentId || undefined,
              promptHint: 'Generate a list of discovery questions tailored to this contact and their division. Focus on uncovering pain points that map to our product capabilities.',
              status: 'pending',
            },
            {
              stepOrder: 3,
              stepType: 'generate_content',
              contentType: 'email',
              channel: 'email',
              contactId: meeting.contactId || undefined,
              divisionId: meeting.companyDepartmentId || undefined,
              promptHint: 'Draft a brief follow-up email template to send after the meeting. Include placeholders for key takeaways and next steps.',
              status: 'pending',
            },
          ],
        },
      },
    });
    created++;
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

    const existing = await prisma.actionWorkflow.findFirst({
      where: {
        userId: contact.company.userId,
        companyId: contact.companyId,
        accountContext: { path: ['eventAttendanceId'], equals: event.id },
      },
      select: { id: true },
    });
    if (existing) continue;

    const contactName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || 'Attendee';
    const hoursUntil = Math.round((event.eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    await prisma.actionWorkflow.create({
      data: {
        userId: contact.company.userId,
        companyId: contact.companyId,
        targetContactId: contact.id,
        targetDivisionId: contact.companyDepartmentId || undefined,
        title: `Event Prep: ${contactName} attending ${event.eventName}`,
        description: `${contactName} (${contact.title ?? 'Unknown title'}) at ${contact.company.name} is attending ${event.eventName} in ${hoursUntil} hours. Prepare your approach.`,
        status: 'pending',
        urgencyScore: hoursUntil <= 6 ? 170 : 145,
        signalContext: {
          source: 'event_prep',
          eventName: event.eventName,
          eventDate: event.eventDate.toISOString(),
          hoursUntil,
          contactName,
          contactTitle: contact.title,
        },
        accountContext: {
          eventAttendanceId: event.id,
          companyName: contact.company.name,
          triggerType: 'event_prep',
        },
        steps: {
          create: [
            {
              stepOrder: 1,
              stepType: 'generate_content',
              contentType: 'talking_points',
              channel: 'task',
              contactId: contact.id,
              divisionId: contact.companyDepartmentId || undefined,
              promptHint: `Prepare a brief on ${contactName} before ${event.eventName}. Cover: their role and priorities, their division's use cases for our products, recent signals, and 3-5 conversation starters for the event.`,
              status: 'pending',
            },
            {
              stepOrder: 2,
              stepType: 'generate_content',
              contentType: 'email',
              channel: 'email',
              contactId: contact.id,
              divisionId: contact.companyDepartmentId || undefined,
              promptHint: `Draft a post-event follow-up email template for ${contactName} after ${event.eventName}. Reference shared context from the event and propose a concrete next step.`,
              status: 'pending',
            },
          ],
        },
      },
    });
    created++;
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
