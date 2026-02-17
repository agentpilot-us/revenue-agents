/**
 * Security audit logging
 * Logs security events to SecurityAuditLog table
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type SecurityEventType =
  | 'rate_limit_exceeded'
  | 'prompt_injection'
  | 'pii_detected'
  | 'tool_abuse'
  | 'unauthorized_access'
  | 'domain_mismatch'
  | 'auth_failed'
  | 'input_sanitized'
  | 'session_expired'
  | 'invalid_token';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  userId?: string;
  visitorId?: string;
  campaignId?: string;
  ipAddress?: string;
  sessionId?: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  details: Record<string, unknown>;
  userAgent?: string;
}

/**
 * Log security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await prisma.securityAuditLog.create({
      data: {
        userId: event.userId || null,
        visitorId: event.visitorId || null,
        campaignId: event.campaignId || null,
        ipAddress: event.ipAddress || null,
        sessionId: event.sessionId || null,
        eventType: event.eventType,
        severity: event.severity,
        details: event.details as Prisma.InputJsonValue,
        userAgent: event.userAgent || null,
      },
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('Failed to log security event:', error);
  }
}

/**
 * Get IP address from request headers
 */
export function getIPAddress(headers: Headers): string | undefined {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    headers.get('fastly-client-ip') ||
    headers.get('x-client-ip') ||
    undefined
  );
}
