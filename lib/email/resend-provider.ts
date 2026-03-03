/**
 * Resend email provider — used for:
 *   - SMB users who haven't connected their own mailbox
 *   - System emails (magic links, alerts) via the direct sendSystemEmail export
 *
 * Wraps the Resend HTTP API. No SDK dependency — keeps the bundle small.
 */

import type { EmailProvider, OutboundEmailParams, OutboundEmailResult } from './types';

const PROVIDER_ID = 'resend' as const;

export class ResendProvider implements EmailProvider {
  readonly id = PROVIDER_ID;
  readonly displayName = 'Resend';

  private readonly fromAddress: string;

  constructor(opts?: { fromAddress?: string }) {
    this.fromAddress =
      opts?.fromAddress ??
      process.env.RESEND_FROM ??
      'onboarding@resend.dev';
  }

  async isReady(): Promise<boolean> {
    const key = process.env.RESEND_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  async send(params: OutboundEmailParams): Promise<OutboundEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY not configured', provider: PROVIDER_ID };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
          reply_to: params.replyTo,
          cc: params.cc,
        }),
      });

      const data = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) {
        return {
          ok: false,
          error: data.message ?? res.statusText,
          provider: PROVIDER_ID,
        };
      }

      return { ok: true, messageId: data.id ?? 'unknown', provider: PROVIDER_ID };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Resend send failed',
        provider: PROVIDER_ID,
      };
    }
  }
}

/**
 * Send a system email (magic link, alert, etc.) — always via Resend.
 * This is NOT for rep outbound. Use getOutboundProvider() for that.
 */
export async function sendSystemEmail(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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
      return { ok: false, error: data.message ?? res.statusText };
    }
    return { ok: true, id: data.id ?? 'unknown' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' };
  }
}
