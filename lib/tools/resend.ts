/**
 * Resend – send transactional email.
 * Thin wrapper; webhook events at /api/webhooks/resend.
 */

export type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: params.from ?? process.env.RESEND_FROM ?? 'onboarding@resend.dev',
        to: [params.to],
        subject: params.subject,
        html: params.html ?? params.text,
        text: params.text,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: (data as { message?: string }).message ?? res.statusText };
    }
    return { ok: true, id: data.id ?? 'unknown' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' };
  }
}
