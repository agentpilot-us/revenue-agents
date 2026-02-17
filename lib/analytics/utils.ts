import { headers } from 'next/headers';
import type { DeviceType, Browser, OS, TrafficSource } from '@/lib/types/analytics';

/**
 * Generate a unique session ID for tracking
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Parse user agent to extract device info
 */
export function parseUserAgent(userAgent?: string | null): {
  deviceType: DeviceType;
  browser: Browser;
  os: OS;
} {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'other', os: 'other' };
  }

  const lower = userAgent.toLowerCase();

  // Determine device type
  let deviceType: DeviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(lower)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(lower)) {
    deviceType = 'tablet';
  } else if (/bot|crawler|spider|crawling/i.test(lower)) {
    deviceType = 'bot';
  }

  // Determine browser
  let browser: Browser = 'other';
  if (/chrome/i.test(lower) && !/edg|opr/i.test(lower)) {
    browser = 'chrome';
  } else if (/safari/i.test(lower) && !/chrome|android/i.test(lower)) {
    browser = 'safari';
  } else if (/firefox/i.test(lower)) {
    browser = 'firefox';
  } else if (/edg/i.test(lower)) {
    browser = 'edge';
  }

  // Determine OS
  let os: OS = 'other';
  if (/windows/i.test(lower)) {
    os = 'windows';
  } else if (/macintosh|mac os x/i.test(lower)) {
    os = 'macos';
  } else if (/iphone|ipad|ipod/i.test(lower)) {
    os = 'ios';
  } else if (/android/i.test(lower)) {
    os = 'android';
  } else if (/linux/i.test(lower)) {
    os = 'linux';
  }

  return { deviceType, browser, os };
}

/**
 * Get visitor's IP address from headers
 */
export function getVisitorIP(headers: Headers): string | null {
  // Try different header sources in order
  const ipSources = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'x-client-ip',
  ];

  for (const source of ipSources) {
    const ip = headers.get(source);
    if (ip) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return ip.split(',')[0].trim();
    }
  }

  return null;
}

/**
 * Determine traffic source from UTM params and referrer
 */
export function determineTrafficSource(
  utmSource?: string | null,
  utmMedium?: string | null,
  referrer?: string | null
): TrafficSource {
  // UTM source takes priority
  if (utmSource) {
    const sourceLower = utmSource.toLowerCase();
    if (sourceLower.includes('email') || sourceLower === 'email') {
      return 'email';
    }
    if (sourceLower.includes('linkedin') || sourceLower === 'linkedin') {
      return 'linkedin';
    }
    if (utmMedium === 'cpc' || utmMedium === 'paid' || utmMedium === 'ppc') {
      return 'paid';
    }
    if (utmMedium === 'organic' || utmMedium === 'search') {
      return 'organic';
    }
    return 'referral';
  }

  // Check referrer
  if (referrer) {
    const refLower = referrer.toLowerCase();
    if (refLower.includes('linkedin.com')) {
      return 'linkedin';
    }
    if (refLower.includes('google.com') || refLower.includes('bing.com') || refLower.includes('yahoo.com')) {
      return 'organic';
    }
    return 'referral';
  }

  return 'direct';
}
