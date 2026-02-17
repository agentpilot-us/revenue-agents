/**
 * Tool execution monitoring
 * Tracks tool usage patterns and logs suspicious activity
 */

import { logSecurityEvent } from './audit';

interface ToolExecution {
  toolName: string;
  input: unknown;
  userId?: string;
  visitorId?: string;
  campaignId?: string;
  timestamp: Date;
}

// Track recent tool executions (in-memory, consider Redis for production)
const toolExecutionHistory = new Map<string, ToolExecution[]>();

// Clean up old entries periodically
setInterval(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  for (const [key, executions] of toolExecutionHistory.entries()) {
    const recent = executions.filter((e) => e.timestamp > fiveMinutesAgo);
    if (recent.length === 0) {
      toolExecutionHistory.delete(key);
    } else {
      toolExecutionHistory.set(key, recent);
    }
  }
}, 60000); // Clean up every minute

/**
 * Log tool execution and check for abuse patterns
 */
export async function logToolExecution(
  toolName: string,
  input: unknown,
  userId?: string,
  visitorId?: string,
  campaignId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const identifier = userId || visitorId || ipAddress || 'unknown';
  const executions = toolExecutionHistory.get(identifier) || [];
  
  executions.push({
    toolName,
    input,
    userId,
    visitorId,
    campaignId,
    timestamp: new Date(),
  });

  // Keep only last 50 executions per identifier
  if (executions.length > 50) {
    executions.shift();
  }

  toolExecutionHistory.set(identifier, executions);

  // Check for abuse patterns
  const recentExecutions = executions.filter(
    (e) => e.timestamp > new Date(Date.now() - 60 * 1000) // Last minute
  );

  // Pattern 1: Too many tool calls in short time
  if (recentExecutions.length > 20) {
    await logSecurityEvent({
      eventType: 'tool_abuse',
      severity: 'high',
      userId,
      visitorId,
      campaignId,
      ipAddress,
      userAgent,
      details: {
        toolName,
        pattern: 'rapid_fire',
        count: recentExecutions.length,
        window: '1 minute',
      },
    });
  }

  // Pattern 2: Same tool called repeatedly
  const sameToolCount = recentExecutions.filter((e) => e.toolName === toolName).length;
  if (sameToolCount > 10) {
    await logSecurityEvent({
      eventType: 'tool_abuse',
      severity: 'medium',
      userId,
      visitorId,
      campaignId,
      ipAddress,
      userAgent,
      details: {
        toolName,
        pattern: 'repeated_calls',
        count: sameToolCount,
        window: '1 minute',
      },
    });
  }
}

/**
 * Validate email input to prevent injection attacks
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for email injection patterns
  const injectionPatterns = [/\r/, /\n/, /%0a/i, /%0d/i, /bcc:/i, /cc:/i, /to:/i];
  for (const pattern of injectionPatterns) {
    if (pattern.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }

  // Length check
  if (email.length > 254) {
    return { valid: false, error: 'Email too long' };
  }

  return { valid: true };
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs that could be used for XSS
  sanitized = sanitized.replace(/data:\s*text\/html/gi, '');
  
  return sanitized;
}
