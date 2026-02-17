import { prisma } from '@/lib/db';
import type { AlertType } from '@prisma/client';
import { sendEmailAlert } from './channels/email';
import { sendSlackAlert } from './channels/slack';
import { sendWebhookAlert } from './channels/webhook';

type VisitForAlerts = {
  id: string;
  campaignId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  visitorCompany: string | null;
  visitorJobTitle: string | null;
  chatMessages: number;
  ctaClicked: boolean;
  formSubmitted: boolean;
  sessionId: string | null;
  timeOnPage: number;
};

export async function checkAndTriggerAlerts(visit: VisitForAlerts): Promise<void> {
  const campaign = await prisma.segmentCampaign.findUnique({
    where: { id: visit.campaignId },
    include: {
      company: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              alertSettings: true,
              slackWebhookUrl: true,
            },
          },
        },
      },
    },
  });

  if (!campaign?.company?.user) return;

  const user = campaign.company.user;
  const settings = (user.alertSettings as Record<string, unknown>) || {};
  if (settings.enabled === false) return;

  const conditions = await detectAlertConditions(visit, campaign);

  for (const alert of conditions) {
    await createAndSendAlert({
      userId: user.id,
      userEmail: user.email,
      campaignId: visit.campaignId,
      visitId: visit.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      data: alert.data,
      alertSettings: settings,
      slackWebhookUrl: user.slackWebhookUrl,
    });
  }
}

async function detectAlertConditions(
  visit: VisitForAlerts,
  campaign: { company: { name: string } }
): Promise<Array<{ type: AlertType; title: string; message: string; data: Record<string, unknown> }>> {
  const out: Array<{ type: AlertType; title: string; message: string; data: Record<string, unknown> }> = [];
  const companyName = campaign.company.name;
  const campaignName = (campaign as { title?: string }).title ?? 'Landing page';
  const visitorName = visit.visitorName || 'A visitor';
  const visitorEmail = visit.visitorEmail || 'Unknown';
  const visitorCompany = visit.visitorCompany || 'Unknown company';
  const visitorTitle = visit.visitorJobTitle || '';

  if (visit.visitorEmail && visit.visitorCompany === companyName) {
    out.push({
      type: 'HIGH_VALUE_VISITOR',
      title: `🎯 ${visitorName} from ${companyName} visited your page`,
      message: `${visitorName} (${visitorEmail}) from your target account ${companyName} just visited "${campaignName}".`,
      data: { visitorName, visitorEmail, visitorCompany, visitorTitle, campaignName },
    });
  }

  if (visitorTitle && isExecutive(visitorTitle)) {
    out.push({
      type: 'EXECUTIVE_VISIT',
      title: `👔 Executive from ${visitorCompany} visited`,
      message: `${visitorName}, ${visitorTitle} at ${visitorCompany}, visited "${campaignName}".`,
      data: { visitorName, visitorEmail, visitorCompany, visitorTitle, campaignName },
    });
  }

  if (visit.chatMessages >= 5) {
    out.push({
      type: 'MULTIPLE_CHAT_MESSAGES',
      title: `💬 ${visitorName} is highly engaged`,
      message: `${visitorName} from ${visitorCompany} sent ${visit.chatMessages} chat messages on "${campaignName}". They're very interested!`,
      data: { visitorName, visitorEmail, visitorCompany, chatMessages: visit.chatMessages, campaignName },
    });
  }

  if (visit.formSubmitted) {
    out.push({
      type: 'FORM_SUBMISSION',
      title: `📝 ${visitorName} submitted the form`,
      message: `${visitorName} (${visitorEmail}) from ${visitorCompany} submitted the contact form on "${campaignName}".`,
      data: { visitorName, visitorEmail, visitorCompany, visitorTitle, campaignName },
    });
  }

  if (visit.ctaClicked) {
    out.push({
      type: 'CTA_CLICKED',
      title: `🎯 ${visitorName} clicked your CTA`,
      message: `${visitorName} from ${visitorCompany} clicked the main CTA on "${campaignName}".`,
      data: { visitorName, visitorEmail, visitorCompany, campaignName },
    });
  }

  if (visit.visitorEmail) {
    const previousVisits = await prisma.campaignVisit.findMany({
      where: {
        campaignId: visit.campaignId,
        visitorEmail: visit.visitorEmail,
        sessionId: visit.sessionId ? { not: visit.sessionId } : undefined,
      },
      select: { chatMessages: true, timeOnPage: true },
    });
    const totalChat = previousVisits.reduce((s, v) => s + v.chatMessages, 0);
    const avgTime = previousVisits.length > 0
      ? previousVisits.reduce((s, v) => s + v.timeOnPage, 0) / previousVisits.length
      : 0;
    if (previousVisits.length > 0 && (totalChat > 3 || avgTime > 60)) {
      out.push({
        type: 'RETURNING_VISITOR',
        title: `🔄 ${visitorName} returned to your page`,
        message: `${visitorName} from ${visitorCompany} visited "${campaignName}" again. They've visited ${previousVisits.length + 1} times total.`,
        data: { visitorName, visitorEmail, visitorCompany, totalVisits: previousVisits.length + 1, campaignName },
      });
    }
  }

  return out;
}

async function createAndSendAlert({
  userId,
  userEmail,
  campaignId,
  visitId,
  type,
  title,
  message,
  data,
  alertSettings,
  slackWebhookUrl,
}: {
  userId: string;
  userEmail: string | null;
  campaignId: string;
  visitId: string;
  type: AlertType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  alertSettings: Record<string, unknown>;
  slackWebhookUrl: string | null;
}): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.alert.findFirst({
    where: {
      userId,
      campaignId,
      visitId,
      type,
      createdAt: { gte: since },
    },
  });
  if (recent) {
    console.log(`[Alerts] Skipping duplicate: ${type} visit ${visitId}`);
    return;
  }

  const alert = await prisma.alert.create({
    data: { userId, campaignId, visitId, type, title, message, data },
  });

  const promises: Promise<boolean>[] = [];

  const useDigest = alertSettings.emailDigest === 'daily';
  if (alertSettings.email !== false && userEmail && !useDigest) {
    promises.push(
      sendEmailAlert({ to: userEmail, title, message, data, alertId: alert.id }).then((ok) => {
        if (ok) prisma.alert.update({ where: { id: alert.id }, data: { sentViaEmail: true } }).catch(() => {});
        return ok;
      })
    );
  }

  if (alertSettings.slack !== false && slackWebhookUrl) {
    promises.push(
      sendSlackAlert({ webhookUrl: slackWebhookUrl, title, message, data, alertId: alert.id }).then((ok) => {
        if (ok) prisma.alert.update({ where: { id: alert.id }, data: { sentViaSlack: true } }).catch(() => {});
        return ok;
      })
    );
  }

  const webhookUrl = alertSettings.webhookUrl as string | undefined;
  if (webhookUrl) {
    promises.push(
      sendWebhookAlert({ webhookUrl, alert: { type, title, message, data } }).then((ok) => {
        if (ok) prisma.alert.update({ where: { id: alert.id }, data: { sentViaWebhook: true } }).catch(() => {});
        return ok;
      })
    );
  }

  await Promise.all(promises);
}

function isExecutive(title: string): boolean {
  const lower = title.toLowerCase();
  const terms = ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'chief', 'president', 'vp', 'vice president', 'director', 'head of', 'svp', 'evp'];
  return terms.some((t) => lower.includes(t));
}
