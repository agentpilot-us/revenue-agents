/**
 * Input sanitization utilities
 * Removes HTML tags, script tags, and dangerous characters
 */

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous characters that could be used for injection
  sanitized = sanitized.replace(/[<>\"'`]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Check if input was modified during sanitization (potential attack)
 */
export function wasInputModified(original: string, sanitized: string): boolean {
  return original.trim() !== sanitized.trim();
}
