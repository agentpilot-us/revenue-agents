export async function sendWebhookAlert({
  webhookUrl,
  alert,
}: {
  webhookUrl: string;
  alert: { type: string; title: string; message: string; data: Record<string, unknown> };
}): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'visitor_alert',
        timestamp: new Date().toISOString(),
        type: alert.type,
        title: alert.title,
        message: alert.message,
        data: alert.data,
      }),
    });
    if (!res.ok) throw new Error(`Webhook ${res.status}`);
    console.log(`[Alerts] Webhook sent: ${alert.title}`);
    return true;
  } catch (e) {
    console.error('[Alerts] Webhook error:', e);
    return false;
  }
}
