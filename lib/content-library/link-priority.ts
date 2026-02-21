/**
 * Prioritize sitemap links for content library scraping.
 * High-value pages are recommended by default; low-value (blog, legal, etc.) are optional.
 */

const HIGH_VALUE_PATTERNS = [
  '/product',
  '/products',
  '/platform',
  '/solution',
  '/solutions',
  '/use-case',
  '/use-cases',
  '/why-us',
  '/customers',
  '/case-study',
  '/case-studies',
  '/pricing',
  '/features',
  '/how-it-works',
];

const LOW_VALUE_PATTERNS = [
  '/blog',
  '/news',
  '/press',
  '/legal',
  '/privacy',
  '/terms',
  '/careers',
  '/career',
  '/about/team',
  '/login',
  '/signup',
  '/subscribe',
];

export type MapLink = { url: string; title?: string; description?: string };

function pathMatches(url: string, patterns: string[]): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return patterns.some((p) => path.includes(p) || path === p.slice(0, -1));
  } catch {
    return false;
  }
}

export function prioritizeMapLinks(links: MapLink[]): {
  highValue: MapLink[];
  lowValue: MapLink[];
  links: MapLink[];
} {
  const highValue: MapLink[] = [];
  const lowValue: MapLink[] = [];
  for (const link of links) {
    if (pathMatches(link.url, LOW_VALUE_PATTERNS)) {
      lowValue.push(link);
    } else {
      highValue.push(link);
    }
  }
  return { links, highValue, lowValue };
}
