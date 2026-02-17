/**
 * Domain matching utilities for landing page authentication
 * Handles matching email domains to company domains with subdomain support
 */

/**
 * Extract and normalize domain from email address
 */
export function extractEmailDomain(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) {
    throw new Error('Invalid email format');
  }
  const domain = parts[1];
  // Remove www. prefix if present
  return domain.replace(/^www\./, '');
}

/**
 * Match email domain to company domain
 * Handles:
 * - Exact matches: "company.com" === "company.com"
 * - Subdomain matches: "user@subdomain.company.com" matches "company.com"
 * - www variants: "www.company.com" matches "company.com"
 * - Case-insensitive comparison
 */
export function matchDomains(emailDomain: string, companyDomain: string | null): boolean {
  if (!companyDomain) {
    // If company has no domain set, allow access (optional auth)
    return true;
  }

  // Normalize both domains
  const normalizedEmailDomain = emailDomain.toLowerCase().trim().replace(/^www\./, '');
  const normalizedCompanyDomain = companyDomain.toLowerCase().trim().replace(/^www\./, '');

  // Exact match
  if (normalizedEmailDomain === normalizedCompanyDomain) {
    return true;
  }

  // Subdomain match: check if email domain ends with company domain
  // e.g., "subdomain.company.com" ends with ".company.com"
  if (normalizedEmailDomain.endsWith('.' + normalizedCompanyDomain)) {
    return true;
  }

  return false;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
