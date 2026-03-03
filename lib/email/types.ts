/**
 * Email provider abstraction.
 *
 * Two categories of email in the app:
 *   1. System emails  – magic links, alerts, visitor notifications.
 *                        Always sent from the app's domain via Resend.
 *   2. Outbound emails – rep-to-prospect communications.
 *                        Sent via the rep's connected mailbox (Gmail, Outlook, etc.)
 *                        or falls back to Resend for SMB users.
 *
 * This module defines the interface that all outbound providers implement.
 * System emails continue using lib/tools/resend.ts directly.
 */

export type OutboundEmailParams = {
  /** Recipient address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML body (preferred) */
  html: string;
  /** Plain-text fallback */
  text?: string;
  /** Reply-to address (defaults to rep's email) */
  replyTo?: string;
  /** Optional CC addresses */
  cc?: string[];
  /** Optional thread/conversation ID for threading (provider-specific) */
  threadId?: string;
};

export type OutboundEmailResult =
  | { ok: true; messageId: string; provider: string }
  | { ok: false; error: string; provider: string };

/**
 * Every outbound email provider implements this interface.
 * Providers are resolved per-user at send time.
 */
export interface EmailProvider {
  readonly id: string;
  readonly displayName: string;

  /** Check whether this provider is ready (tokens valid, API key present, etc.) */
  isReady(): Promise<boolean>;

  /** Send an outbound email on behalf of the rep. */
  send(params: OutboundEmailParams): Promise<OutboundEmailResult>;
}

/**
 * Identifies which provider a user has connected.
 * Stored conceptually on the User model; resolved at runtime.
 */
export type EmailProviderType = 'resend' | 'gmail' | 'outlook' | 'salesforce';
