export async function sendSlackAlert({
  webhookUrl,
  title,
  message,
  data,
  alertId: _alertId,
}: {
  webhookUrl: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  alertId: string;
}): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const blocks: unknown[] = [
      { type: 'header', text: { type: 'plain_text', text: title, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: message } },
    ];
    const fields: unknown[] = [];
    if (data.visitorName) fields.push({ type: 'mrkdwn', text: `*Name:*\n${String(data.visitorName)}` });
    if (data.visitorEmail) fields.push({ type: 'mrkdwn', text: `*Email:*\n${String(data.visitorEmail)}` });
    if (data.visitorCompany) fields.push({ type: 'mrkdwn', text: `*Company:*\n${String(data.visitorCompany)}` });
    if (data.visitorTitle) fields.push({ type: 'mrkdwn', text: `*Title:*\n${String(data.visitorTitle)}` });
    if (fields.length > 0) blocks.push({ type: 'section', fields });
    blocks.push({
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'View in Dashboard', emoji: true }, url: `${baseUrl}/dashboard/alerts`, style: 'primary' },
      ],
    });

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: title, blocks }),
    });
    if (!res.ok) {
      throw new Error(`Slack ${res.status}`);
    }
    console.log(`[Alerts] Slack sent: ${title}`);
    return true;
  } catch (e) {
    console.error('[Alerts] Slack error:', e);
    return false;
  }
}
