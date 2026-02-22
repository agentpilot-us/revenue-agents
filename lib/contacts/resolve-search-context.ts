/**
 * Title translation layer for contact search.
 * Builds Apollo search context from department + segmentation strategy so that
 * USE_CASE/DIVISIONAL segments (e.g. "Autonomous Vehicles") get keyword-based
 * matching while FUNCTIONAL segments use title vocabulary directly.
 */

export type SeniorityLevel = 'specialist' | 'manager_director' | 'vp' | 'c_level';

export type SearchContext = {
  titles: string[];
  keywords: string[];
  seniorityLevels: string[];
};

const SENIORITY_TO_APOLLO: Record<SeniorityLevel, string[]> = {
  specialist: ['individual_contributor', 'entry'],
  manager_director: ['manager', 'director'],
  vp: ['vp'],
  c_level: ['c_suite', 'partner', 'owner'],
};

export function mapToApolloSeniority(levels: SeniorityLevel[]): string[] {
  if (levels.length === 0) return [];
  return [...new Set(levels.flatMap((l) => SENIORITY_TO_APOLLO[l] ?? []))];
}

function flattenTargetRoles(
  targetRoles: {
    economicBuyer?: string[];
    technicalEvaluator?: string[];
    champion?: string[];
    influencer?: string[];
  } | null
): string[] {
  if (!targetRoles || typeof targetRoles !== 'object') return [];
  const out: string[] = [];
  for (const key of ['economicBuyer', 'technicalEvaluator', 'champion', 'influencer'] as const) {
    const arr = targetRoles[key];
    if (Array.isArray(arr)) out.push(...arr.filter((t): t is string => typeof t === 'string'));
  }
  return [...new Set(out)];
}

function filterByLevel(titles: string[], levels: SeniorityLevel[]): string[] {
  if (levels.length === 0) return titles;
  return titles.filter((title) => {
    const t = title.toLowerCase();
    return levels.some((level) => {
      if (level === 'c_level')
        return /\b(ceo|coo|cfo|cto|cmo|cro|chief|president)\b/.test(t);
      if (level === 'vp') return /\bvp\b|vice president/.test(t);
      if (level === 'manager_director')
        return /\b(director|manager|head of|lead)\b/.test(t);
      if (level === 'specialist')
        return !/\b(vp|vice president|director|manager|chief|president)\b/.test(t);
      return true;
    });
  });
}

/** Extract key phrases from use case text for keyword search (e.g. "autonomous driving", "ADAS"). */
function extractKeyPhrases(useCase: string): string[] {
  const text = useCase.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const phrases: string[] = [];
  // Acronyms (2–5 caps)
  const acronyms = text.match(/\b[A-Z]{2,5}\b/g);
  if (acronyms) phrases.push(...acronyms.map((a) => a.toLowerCase()));
  // Notable phrases: title case or quoted
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) phrases.push(...quoted.map((q) => q.replace(/"/g, '').trim()));
  // Words that look like domain terms (longer than 5 chars, not common stop words)
  const stop = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will', 'their', 'which']);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 5 && !stop.has(w));
  const unique = [...new Set(words)].slice(0, 8);
  phrases.push(...unique);
  return [...new Set(phrases)].filter(Boolean);
}

export type DepartmentForSearchContext = {
  customName: string | null;
  type: string;
  targetRoles: {
    economicBuyer?: string[];
    technicalEvaluator?: string[];
    champion?: string[];
    influencer?: string[];
  } | null;
  useCase: string | null;
};

/**
 * Build search context for Apollo: titles (from targetRoles, filtered by seniority),
 * keywords (for USE_CASE/DIVISIONAL to bridge buying group name and profile vocabulary),
 * and Apollo seniority levels.
 */
export function resolveSearchContext(
  department: DepartmentForSearchContext,
  segmentationStrategy: string | null,
  seniorityFilter: SeniorityLevel[]
): SearchContext {
  const rolesFromResearch = flattenTargetRoles(department.targetRoles);
  const titles = filterByLevel(rolesFromResearch, seniorityFilter);
  const keywords: string[] = [];

  if (segmentationStrategy === 'USE_CASE' || segmentationStrategy === 'DIVISIONAL') {
    if (department.customName) keywords.push(department.customName);
    if (department.useCase) {
      keywords.push(...extractKeyPhrases(department.useCase));
    }
  }

  const seniorityLevels = mapToApolloSeniority(seniorityFilter);
  return { titles, keywords, seniorityLevels };
}
