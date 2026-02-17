/**
 * Prompt injection detection
 * Detects common patterns used to manipulate AI behavior
 */

export interface PromptInjectionResult {
  isInjection: boolean;
  confidence: number; // 0-1, where 1 is high confidence
  pattern: string;
}

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(text: string): PromptInjectionResult {
  const lowerText = text.toLowerCase();
  let confidence = 0;
  let detectedPattern = '';

  // High confidence patterns
  const highConfidencePatterns = [
    { pattern: /ignore\s+(previous|all|above)\s+(instructions|prompts?|rules?)/i, name: 'ignore_instructions' },
    { pattern: /forget\s+(previous|all|above)\s+(instructions|prompts?|rules?)/i, name: 'forget_instructions' },
    { pattern: /you\s+are\s+now\s+(a|an)\s+/i, name: 'role_override' },
    { pattern: /system\s*:\s*/i, name: 'system_prefix' },
    { pattern: /###\s*(system|instruction|prompt)\s*:/i, name: 'markdown_system' },
    { pattern: /<\|(system|user|assistant)\|>/i, name: 'special_tokens' },
    { pattern: /override\s+(system|instructions?|prompts?)/i, name: 'override' },
  ];

  // Medium confidence patterns
  const mediumConfidencePatterns = [
    { pattern: /new\s+(instructions?|prompts?|rules?)\s*:/i, name: 'new_instructions' },
    { pattern: /act\s+as\s+(if\s+)?(you\s+are\s+)?/i, name: 'act_as' },
    { pattern: /pretend\s+(you\s+are\s+)?(that\s+)?/i, name: 'pretend' },
    { pattern: /disregard\s+(previous|all|above)/i, name: 'disregard' },
  ];

  // Check high confidence patterns
  for (const { pattern, name } of highConfidencePatterns) {
    if (pattern.test(lowerText)) {
      confidence = Math.max(confidence, 0.9);
      detectedPattern = name;
    }
  }

  // Check medium confidence patterns (only if no high confidence match)
  if (confidence < 0.9) {
    for (const { pattern, name } of mediumConfidencePatterns) {
      if (pattern.test(lowerText)) {
        confidence = Math.max(confidence, 0.6);
        detectedPattern = name;
      }
    }
  }

  // Check for suspicious character patterns
  if (confidence === 0) {
    // Multiple special characters that might indicate encoding/obfuscation
    const specialCharCount = (text.match(/[<>{}[\]\\|`~!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialCharCount > text.length * 0.3) {
      confidence = 0.4;
      detectedPattern = 'suspicious_characters';
    }
  }

  return {
    isInjection: confidence >= 0.6,
    confidence,
    pattern: detectedPattern || 'none',
  };
}
