import { sendEmail } from '@/lib/tools/resend';

function buildAlertHtml(title: string, message: string, data: Record<string, unknown>): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const details: string[] = [];
  if (data.visitorName) details.push(`<strong>Name:</strong> ${String(data.visitorName)}`);
  if (data.visitorEmail) details.push(`<strong>Email:</strong> ${String(data.visitorEmail)}`);
  if (data.visitorCompany) details.push(`<strong>Company:</strong> ${String(data.visitorCompany)}`);
  if (data.visitorTitle) details.push(`<strong>Title:</strong> ${String(data.visitorTitle)}`);
  const detailsBlock =
    details.length > 0
      ? `<div style="background:#f6f9fc;border-radius:8px;margin:20px 40px;padding:20px;"><p style="font-size:14px;font-weight:bold;margin-bottom:12px;">Visitor Details</p>${details.map((d) => `<p style="font-size:14px;margin:8px 0;color:#525252">${d}</p>`).join('')}</div>`
      : '';
  const campaignLine = data.campaignName
    ? `<p style="font-size:14px;margin:8px 0;"><strong>Campaign:</strong> ${String(data.campaignName)}</p>`
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0">
  <div style="background:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px">
    <h1 style="font-size:24px;font-weight:bold;margin:40px 0 20px;padding:0 40px">${escapeHtml(title)}</h1>
    <p style="font-size:16px;line-height:24px;margin:0 0 20px;padding:0 40px;color:#525252">${escapeHtml(message)}</p>
    ${detailsBlock}
    ${campaignLine}
    <p style="padding:0 40px;margin:20px 0">
      <a href="${baseUrl}/dashboard/alerts" style="display:inline-block;background:#3B82F6;color:#fff;font-size:16px;font-weight:bold;padding:12px 20px;border-radius:8px;text-decoration:none">View in Dashboard</a>
    </p>
    <p style="color:#8898aa;font-size:12px;padding:0 40px;margin-top:32px">
      You're receiving this because you enabled alerts. <a href="${baseUrl}/dashboard/settings/alerts" style="color:#3B82F6">Manage alert settings</a>
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type DigestAlertItem = {
  id: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: Date;
};

function buildDigestHtml(alerts: DigestAlertItem[]): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const items = alerts
    .map(
      (a) => {
        const details: string[] = [];
        const d = a.data as Record<string, unknown>;
        if (d.visitorName) details.push(`<strong>Name:</strong> ${escapeHtml(String(d.visitorName))}`);
        if (d.visitorEmail) details.push(`<strong>Email:</strong> ${escapeHtml(String(d.visitorEmail))}`);
        if (d.visitorCompany) details.push(`<strong>Company:</strong> ${escapeHtml(String(d.visitorCompany))}`);
        if (d.campaignName) details.push(`<strong>Campaign:</strong> ${escapeHtml(String(d.campaignName))}`);
        const detailsHtml =
          details.length > 0
            ? `<p style="font-size:13px;margin:4px 0;color:#525252">${details.join(' &middot; ')}</p>`
            : '';
        return `
    <div style="border-bottom:1px solid #e5e7eb;padding:16px 0">
      <h2 style="font-size:16px;font-weight:600;margin:0 0 8px">${escapeHtml(a.title)}</h2>
      <p style="font-size:14px;line-height:20px;margin:0;color:#525252">${escapeHtml(a.message)}</p>
      ${detailsHtml}
    </div>`;
      }
    )
    .join('');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0">
  <div style="background:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px">
    <h1 style="font-size:22px;font-weight:bold;margin:40px 40px 16px;padding:0">Your daily alert digest</h1>
    <p style="font-size:14px;color:#6b7280;margin:0 40px 24px;padding:0">${alerts.length} alert${alerts.length === 1 ? '' : 's'} from the last 24 hours.</p>
    <div style="padding:0 40px 24px">
      ${items}
    </div>
    <p style="padding:0 40px;margin:24px 0">
      <a href="${baseUrl}/dashboard/alerts" style="display:inline-block;background:#3B82F6;color:#fff;font-size:16px;font-weight:bold;padding:12px 20px;border-radius:8px;text-decoration:none">View all alerts</a>
    </p>
    <p style="color:#8898aa;font-size:12px;padding:0 40px;margin-top:32px">
      You're receiving this because you chose the daily digest. <a href="${baseUrl}/dashboard/settings/alerts" style="color:#3B82F6">Change alert settings</a>
    </p>
  </div>
</body>
</html>`;
}

export async function sendDigestEmail({
  to,
  alerts,
}: {
  to: string;
  alerts: DigestAlertItem[];
}): Promise<boolean> {
  if (alerts.length === 0) return true;
  try {
    const result = await sendEmail({
      to,
      subject: `Your alert digest: ${alerts.length} alert${alerts.length === 1 ? '' : 's'}`,
      html: buildDigestHtml(alerts),
      from: process.env.RESEND_FROM_ALERTS || process.env.RESEND_FROM,
    });
    if (result.ok) {
      console.log(`[Alerts] Digest sent to ${to}: ${alerts.length} alerts`);
      return true;
    }
    console.error('[Alerts] Digest email failed:', result);
    return false;
  } catch (e) {
    console.error('[Alerts] Digest email error:', e);
    return false;
  }
}

export async function sendEmailAlert({
  to,
  title,
  message,
  data,
  alertId: _alertId,
}: {
  to: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  alertId: string;
}): Promise<boolean> {
  try {
    const result = await sendEmail({
      to,
      subject: title,
      html: buildAlertHtml(title, message, data),
      from: process.env.RESEND_FROM_ALERTS || process.env.RESEND_FROM,
    });
    if (result.ok) {
      console.log(`[Alerts] Email sent to ${to}: ${title}`);
      return true;
    }
    console.error('[Alerts] Email failed:', result);
    return false;
  } catch (e) {
    console.error('[Alerts] Email error:', e);
    return false;
  }
}
