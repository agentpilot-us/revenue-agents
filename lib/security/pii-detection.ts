/**
 * PII (Personally Identifiable Information) detection and redaction
 */

export type PIIType = 'email' | 'phone' | 'ssn' | 'credit_card' | 'ip_address';

export interface PIIDetectionResult {
  hasPII: boolean;
  types: PIIType[];
  redacted: string;
}

/**
 * Detect and redact PII from text
 */
export function detectPII(text: string): PIIDetectionResult {
  const types: PIIType[] = [];
  let redacted = text;

  // Email detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailRegex.test(text)) {
    types.push('email');
    redacted = redacted.replace(emailRegex, '[EMAIL_REDACTED]');
  }

  // Phone number detection (US format)
  const phoneRegex = /\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
  if (phoneRegex.test(text)) {
    types.push('phone');
    redacted = redacted.replace(phoneRegex, '[PHONE_REDACTED]');
  }

  // SSN detection (XXX-XX-XXXX format)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  if (ssnRegex.test(text)) {
    types.push('ssn');
    redacted = redacted.replace(ssnRegex, '[SSN_REDACTED]');
  }

  // Credit card detection (basic pattern - 13-19 digits with optional dashes/spaces)
  const creditCardRegex = /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g;
  if (creditCardRegex.test(text)) {
    types.push('credit_card');
    redacted = redacted.replace(creditCardRegex, '[CARD_REDACTED]');
  }

  // IP address detection
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  if (ipRegex.test(text)) {
    types.push('ip_address');
    redacted = redacted.replace(ipRegex, '[IP_REDACTED]');
  }

  return {
    hasPII: types.length > 0,
    types,
    redacted,
  };
}
