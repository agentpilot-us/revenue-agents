/**
 * Email module — single entry point.
 *
 * Usage:
 *   // System emails (alerts, magic links)
 *   import { sendSystemEmail } from '@/lib/email';
 *   await sendSystemEmail({ to, subject, html });
 *
 *   // Outbound rep emails
 *   import { getOutboundProvider } from '@/lib/email';
 *   const provider = await getOutboundProvider(userId);
 *   const result = await provider.send({ to, subject, html });
 */

export { sendSystemEmail } from './resend-provider';
export { getOutboundProvider, hasOutboundEmailProvider } from './user-provider';
export type {
  EmailProvider,
  OutboundEmailParams,
  OutboundEmailResult,
  EmailProviderType,
} from './types';
