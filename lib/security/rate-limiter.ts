/**
 * Rate limiting utilities
 * In-memory rate limiting (consider Redis for production scale)
 */

type RateLimitType = 'ip' | 'user' | 'session';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

// In-memory store (consider Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Check rate limit
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = `${type}:${identifier}`;
  const now = new Date();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit configuration based on type
 */
export function getRateLimitConfig(type: RateLimitType): { maxRequests: number; windowSeconds: number } {
  switch (type) {
    case 'ip':
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_LANDING_CHAT_REQUESTS || '50', 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_LANDING_CHAT_WINDOW || '600', 10),
      };
    case 'user':
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_REQUESTS || '100', 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '600', 10),
      };
    case 'session':
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_LANDING_CHAT_REQUESTS || '50', 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_LANDING_CHAT_WINDOW || '600', 10),
      };
    default:
      return {
        maxRequests: 50,
        windowSeconds: 600,
      };
  }
}
