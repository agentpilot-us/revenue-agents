/**
 * POST /api/go/[id]/track
 * Track campaign events: visit, share, cta_click, form_submit, engagement.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  trackPageView,
  updateEngagementMetrics,
  trackCTAClick,
  trackFormSubmission,
} from '@/lib/analytics/tracking';
import { checkAndTriggerAlerts } from '@/lib/alerts/trigger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const campaign = await prisma.segmentCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const event = body.event as string | undefined;
    const referrer = req.headers.get('referer') ?? (body.referrer as string | undefined);
    const sessionId = (body.sessionId as string) || undefined;
    const visitId = (body.visitId as string) || undefined;
    const departmentId = (body.departmentId as string) || undefined;
    const fingerprint = (body.fingerprint as string) || undefined;
    const qrCodeId = (body.qrCodeId as string) || undefined;

    if (event === 'visit') {
      const { visitId: id } = await trackPageView({
        campaignId,
        headers: req.headers,
        sessionId: sessionId ?? null,
        fingerprint: fingerprint ?? null,
        departmentId: departmentId ?? null,
        qrCodeId: qrCodeId ?? null,
        referrer: referrer ?? null,
        utm: {
          source: (body.utmSource as string) ?? null,
          medium: (body.utmMedium as string) ?? null,
          campaign: (body.utmCampaign as string) ?? null,
          term: (body.utmTerm as string) ?? null,
          content: (body.utmContent as string) ?? null,
        },
        visitorEmail: (body.visitorEmail as string) ?? null,
        visitorName: (body.visitorName as string) ?? null,
        visitorCompany: (body.visitorCompany as string) ?? null,
        visitorJobTitle: (body.visitorJobTitle as string) ?? null,
      });
      const visit = await prisma.campaignVisit.findUnique({
        where: { id },
      });
      if (visit) {
        checkAndTriggerAlerts(visit as unknown as Parameters<typeof checkAndTriggerAlerts>[0]).catch(() => {});
      }
      return NextResponse.json({ visitId: id });
    }

    if (event === 'engagement' && visitId) {
      await updateEngagementMetrics({
        visitId,
        timeOnPage: body.timeOnPage as number | undefined,
        scrollDepth: body.scrollDepth as number | undefined,
        eventsViewed: body.eventsViewed as string[] | undefined,
        eventsClicked: body.eventsClicked as string[] | undefined,
        caseStudiesViewed: body.caseStudiesViewed as string[] | undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (event === 'cta_click' && visitId) {
      await trackCTAClick(visitId);
      const visit = await prisma.campaignVisit.findUnique({
        where: { id: visitId },
      });
      if (visit) {
        checkAndTriggerAlerts(visit as unknown as Parameters<typeof checkAndTriggerAlerts>[0]).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    if (event === 'form_submit' && visitId) {
      await trackFormSubmission(visitId);
      const visit = await prisma.campaignVisit.findUnique({
        where: { id: visitId },
      });
      if (visit) {
        checkAndTriggerAlerts(visit as unknown as Parameters<typeof checkAndTriggerAlerts>[0]).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    if (event === 'share') {
      await prisma.campaignShare.create({
        data: {
          campaignId,
          channel: (body.channel as string) || 'copy_link',
          sharedByEmail: (body.sharedByEmail as string) || undefined,
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Invalid event. Use visit | engagement | cta_click | form_submit | share' },
      { status: 400 }
    );
  } catch (e) {
    console.error('Track error:', e);
    return NextResponse.json({ error: 'Track failed' }, { status: 500 });
  }
}
