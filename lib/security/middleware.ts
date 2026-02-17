/**
 * Security middleware utilities
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitConfig } from './rate-limiter';
import { logSecurityEvent, getIPAddress, type SecurityEventType } from './audit';
import { headers } from 'next/headers';

export interface RateLimitOptions {
  type: 'ip' | 'user' | 'session';
  identifier: string;
  maxRequests?: number;
  windowSeconds?: number;
}

/**
 * Rate limit middleware wrapper
 */
export async function withRateLimit<T>(
  handler: () => Promise<T>,
  options: RateLimitOptions
): Promise<T | NextResponse> {
  const config = options.maxRequests && options.windowSeconds
    ? { maxRequests: options.maxRequests, windowSeconds: options.windowSeconds }
    : getRateLimitConfig(options.type);

  const result = await checkRateLimit(
    options.identifier,
    options.type,
    config.maxRequests,
    config.windowSeconds
  );

  if (!result.allowed) {
    // Log rate limit exceeded
    const headersList = await headers();
    const ipAddress = getIPAddress(headersList);
    const userAgent = headersList.get('user-agent') || undefined;

    await logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      details: {
        identifier: options.identifier,
        type: options.type,
        limit: config.maxRequests,
        window: config.windowSeconds,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
        },
      }
    );
  }

  return handler();
}
