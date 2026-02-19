import { createHash } from 'crypto';

/**
 * Calculate SHA-256 hash of content for change detection.
 * Normalizes content by extracting markdown/fullText and creating a consistent hash.
 */
export function calculateContentHash(content: unknown): string {
  let textToHash = '';

  if (typeof content === 'string') {
    textToHash = content;
  } else if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    // Prioritize markdown, then fullText, then stringify the whole object
    if (typeof obj.markdown === 'string') {
      textToHash = obj.markdown;
    } else if (typeof obj.fullText === 'string') {
      textToHash = obj.fullText;
    } else {
      // For structured content, create a normalized string representation
      textToHash = JSON.stringify(obj, Object.keys(obj).sort());
    }
  } else {
    textToHash = String(content);
  }

  // Normalize whitespace and create hash
  const normalized = textToHash.trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}
