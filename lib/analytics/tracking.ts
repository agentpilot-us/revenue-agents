import { prisma } from '@/lib/db';
import { parseUserAgent, generateSessionId, getVisitorIP } from '@/lib/analytics/utils';
import type { UTMParameters } from '@/lib/types/analytics';

export interface TrackPageViewParams {
  campaignId: string;
  headers: Headers;
  sessionId?: string | null;
  fingerprint?: string | null;
  departmentId?: string | null;
  qrCodeId?: string | null;
  referrer?: string | null;
  utm?: UTMParameters | null;
  visitorEmail?: string | null;
  visitorName?: string | null;
  visitorCompany?: string | null;
  visitorJobTitle?: string | null;
}

/**
 * Create or update a campaign visit (page view). Uses sessionId to find existing visit in same session;
 * otherwise creates a new visit. Fills UTM, device, location from request.
 */
export async function trackPageView(params: TrackPageViewParams): Promise<{ visitId: string }> {
  const {
    campaignId,
    headers,
    sessionId: inputSessionId,
    fingerprint,
    departmentId,
    qrCodeId,
    referrer,
    utm,
    visitorEmail,
    visitorName,
    visitorCompany,
    visitorJobTitle,
  } = params;

  const sessionId = inputSessionId || generateSessionId();
  const userAgent = headers.get('user-agent') || undefined;
  const { deviceType, browser, os } = parseUserAgent(userAgent);
  const ipAddress = getVisitorIP(headers) ?? undefined;

  const existing = await prisma.campaignVisit.findFirst({
    where: {
      campaignId,
      sessionId: sessionId || undefined,
      visitedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { visitedAt: 'desc' },
    select: { id: true },
  });

  if (existing) {
    await prisma.campaignVisit.update({
      where: { id: existing.id },
      data: {
        lastActivityAt: new Date(),
        ...(referrer !== undefined && { referrer }),
        ...(utm?.source !== undefined && { utmSource: utm.source }),
        ...(utm?.medium !== undefined && { utmMedium: utm.medium }),
        ...(utm?.campaign !== undefined && { utmCampaign: utm.campaign }),
        ...(utm?.term !== undefined && { utmTerm: utm.term }),
        ...(utm?.content !== undefined && { utmContent: utm.content }),
        ...(visitorEmail !== undefined && { visitorEmail }),
        ...(visitorName !== undefined && { visitorName }),
        ...(visitorCompany !== undefined && { visitorCompany }),
        ...(visitorJobTitle !== undefined && { visitorJobTitle }),
      },
    });
    return { visitId: existing.id };
  }

  const visit = await prisma.campaignVisit.create({
    data: {
      campaignId,
      sessionId: sessionId || undefined,
      fingerprint: fingerprint ?? undefined,
      departmentId: departmentId ?? undefined,
      qrCodeId: qrCodeId ?? undefined,
      referrer: referrer ?? undefined,
      utmSource: utm?.source ?? undefined,
      utmMedium: utm?.medium ?? undefined,
      utmCampaign: utm?.campaign ?? undefined,
      utmTerm: utm?.term ?? undefined,
      utmContent: utm?.content ?? undefined,
      userAgent: userAgent ?? undefined,
      deviceType: deviceType ?? undefined,
      browser: browser ?? undefined,
      os: os ?? undefined,
      ipAddress: ipAddress ?? undefined,
      visitorEmail: visitorEmail ?? undefined,
      visitorName: visitorName ?? undefined,
      visitorCompany: visitorCompany ?? undefined,
      visitorJobTitle: visitorJobTitle ?? undefined,
      lastActivityAt: new Date(),
    },
    select: { id: true },
  });
  return { visitId: visit.id };
}

export interface UpdateEngagementParams {
  visitId: string;
  timeOnPage?: number;
  scrollDepth?: number;
  eventsViewed?: string[];
  eventsClicked?: string[];
  caseStudiesViewed?: string[];
}

/**
 * Update engagement metrics on an existing visit (heartbeat / before-unload).
 */
export async function updateEngagementMetrics(params: UpdateEngagementParams): Promise<void> {
  const { visitId, timeOnPage, scrollDepth, eventsViewed, eventsClicked, caseStudiesViewed } = params;
  const data: Record<string, unknown> = { lastActivityAt: new Date() };
  if (timeOnPage !== undefined) data.timeOnPage = timeOnPage;
  if (scrollDepth !== undefined) data.scrollDepth = scrollDepth;
  if (eventsViewed !== undefined) data.eventsViewed = eventsViewed;
  if (eventsClicked !== undefined) data.eventsClicked = eventsClicked;
  if (caseStudiesViewed !== undefined) data.caseStudiesViewed = caseStudiesViewed;
  await prisma.campaignVisit.update({
    where: { id: visitId },
    data,
  });
}

/**
 * Mark CTA as clicked on a visit.
 */
export async function trackCTAClick(visitId: string): Promise<void> {
  await prisma.campaignVisit.update({
    where: { id: visitId },
    data: { ctaClicked: true, ctaClickedAt: new Date(), lastActivityAt: new Date() },
  });
}

/**
 * Mark form as submitted on a visit.
 */
export async function trackFormSubmission(visitId: string): Promise<void> {
  await prisma.campaignVisit.update({
    where: { id: visitId },
    data: { formSubmitted: true, lastActivityAt: new Date() },
  });
}

/**
 * Increment chat message count on a visit (call after each user message or when saving chat analytics).
 */
export async function incrementChatMessages(visitId: string): Promise<void> {
  await prisma.campaignVisit.update({
    where: { id: visitId },
    data: { chatMessages: { increment: 1 }, lastActivityAt: new Date() },
  });
}
