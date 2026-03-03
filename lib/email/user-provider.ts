/**
 * User email provider — resolves the best outbound email provider for a user.
 *
 * Resolution order:
 *   1. Gmail OAuth  (user has gmailAccessToken — future)
 *   2. Outlook OAuth (user has outlookAccessToken — future)
 *   3. Salesforce    (user has salesforceAccessToken + email-send scope — future)
 *   4. Resend        (fallback for SMB / no connected mailbox)
 *
 * Each enterprise provider sends FROM the rep's actual email address,
 * appears in their sent folder, and is tracked by their CRM.
 */

import { prisma } from '@/lib/db';
import type { EmailProvider } from './types';
import { ResendProvider } from './resend-provider';

/**
 * Resolve the outbound email provider for a given user.
 * Checks connected integrations in priority order.
 */
export async function getOutboundProvider(userId: string): Promise<EmailProvider> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      salesforceAccessToken: true,
      // Future: gmailAccessToken, outlookAccessToken
    },
  });

  // Future: check Gmail OAuth tokens
  // if (user?.gmailAccessToken) {
  //   return new GmailProvider(userId);
  // }

  // Future: check Outlook OAuth tokens
  // if (user?.outlookAccessToken) {
  //   return new OutlookProvider(userId);
  // }

  // Future: Salesforce email-send (requires additional scope)
  // if (user?.salesforceAccessToken && hasSalesforceEmailScope(user)) {
  //   return new SalesforceEmailProvider(userId);
  // }

  // Default: Resend with user's email as reply-to
  return new ResendProvider({
    fromAddress: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
  });
}

/**
 * Check whether a user has ANY outbound email provider ready.
 * Used by the chat agent to decide if send_email should be offered.
 */
export async function hasOutboundEmailProvider(userId: string): Promise<boolean> {
  const provider = await getOutboundProvider(userId);
  return provider.isReady();
}
