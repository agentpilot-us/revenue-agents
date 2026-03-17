import { prisma } from '@/lib/db';
import { ContentType } from '@prisma/client';
import { getDepartmentPlaybookKey } from '@/lib/department-mapping';
import type { DepartmentValueProps, ValuePropsByDepartment } from '@/lib/types/industry-playbook';

/** Normalize industry string for matching playbook slug/name (e.g. "Automotive OEM" -> "automotive-oem") */
function normalizeIndustry(industry: string | null): string {
  if (!industry || !industry.trim()) return '';
  return industry
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

type ObjectionHandler = { objection: string; response: string };
type DeptProductMappingRow = { department: string; productIds: string[]; typicalDealSize?: string };

/**
 * Build PRODUCT KNOWLEDGE prompt block from ProductProfile for the given catalog products.
 * If catalogProductIds is omitted, loads all ProductProfiles for the user.
 */
export async function getProductKnowledgeBlock(
  userId: string,
  catalogProductIds?: string[]
): Promise<string | null> {
  const where: { userId: string; catalogProductId?: { in: string[] } } = { userId };
  if (catalogProductIds?.length) {
    where.catalogProductId = { in: catalogProductIds };
  }

  const profiles = await prisma.productProfile.findMany({
    where,
    include: {
      catalogProduct: { select: { id: true, name: true } },
    },
    orderBy: { catalogProduct: { name: 'asc' } },
  });

  if (profiles.length === 0) return null;

  const caseStudyIds = new Set<string>();
  for (const p of profiles) {
    const ids = p.linkedCaseStudyIds as string[] | null;
    if (Array.isArray(ids)) ids.forEach((id) => caseStudyIds.add(id));
  }
  const caseStudyTitles: Record<string, string> = {};
  if (caseStudyIds.size > 0) {
    const rows = await prisma.contentLibrary.findMany({
      where: { id: { in: [...caseStudyIds] }, archivedAt: null },
      select: { id: true, title: true },
    });
    rows.forEach((r) => (caseStudyTitles[r.id] = r.title));
  }

  const lines: string[] = ['PRODUCT KNOWLEDGE (from Content Library — Products):'];

  for (const profile of profiles) {
    const name = profile.catalogProduct.name;
    const oneLiner = profile.oneLiner ?? '';
    const elevatorPitch = profile.elevatorPitch ?? '';
    const valueProps = (profile.valueProps as string[] | null) ?? [];
    const painPoints = (profile.painPoints as string[] | null) ?? [];
    const bestForDepts = (profile.bestForDepartments as string[] | null) ?? [];
    const bestForInd = (profile.bestForIndustries as string[] | null) ?? [];
    const techReqs = (profile.technicalRequirements as string[] | null) ?? [];
    const objectionHandlers = (profile.objectionHandlers as ObjectionHandler[] | null) ?? [];
    const competitive = (profile.competitivePositioning as string[] | null) ?? [];
    const linkedIds = (profile.linkedCaseStudyIds as string[] | null) ?? [];
    const linkedTitles = linkedIds
      .map((id) => caseStudyTitles[id] ?? id)
      .filter(Boolean);

    lines.push('');
    lines.push(`--- ${name} ---`);
    if (profile.priceRangeText) lines.push(`Price range: ${profile.priceRangeText}`);
    if (profile.dealSizeSweetSpot) lines.push(`Deal size sweet spot: ${profile.dealSizeSweetSpot}`);
    if (profile.salesCycle) lines.push(`Sales cycle: ${profile.salesCycle}`);
    if (profile.deployment) lines.push(`Deployment: ${profile.deployment}`);
    if (oneLiner) lines.push(`One-liner: ${oneLiner}`);
    if (elevatorPitch) lines.push(`Elevator pitch: ${elevatorPitch}`);
    if (valueProps.length) {
      lines.push('Value propositions:');
      valueProps.forEach((v) => lines.push(`- ${v}`));
    }
    if (painPoints.length) {
      lines.push('Pain points it solves:');
      painPoints.forEach((p) => lines.push(`- ${p}`));
    }
    if (bestForDepts.length) lines.push(`Best for departments: ${bestForDepts.join(', ')}`);
    if (bestForInd.length) lines.push(`Best for industries: ${bestForInd.join(', ')}`);
    if (techReqs.length) {
      lines.push('Technical requirements:');
      techReqs.forEach((t) => lines.push(`- ${t}`));
    }
    if (objectionHandlers.length) {
      lines.push('Objection handlers:');
      objectionHandlers.forEach((o) => lines.push(`- "${o.objection}" → ${o.response}`));
    }
    if (competitive.length) {
      lines.push('Competitive positioning:');
      competitive.forEach((c) => lines.push(`- ${c}`));
    }
    if (linkedTitles.length) lines.push(`Linked case studies: ${linkedTitles.join('; ')}`);
  }

  return lines.join('\n');
}

/**
 * Build INDUSTRY PLAYBOOK prompt block. Matches company.industry to playbook by normalized slug or name.
 */
export async function getIndustryPlaybookBlock(
  userId: string,
  industry: string | null
): Promise<string | null> {
  if (!industry || !industry.trim()) return null;

  const normalized = normalizeIndustry(industry);

  const playbooks = await prisma.industryPlaybook.findMany({
    where: { userId },
  });

  const playbook = playbooks.find(
    (p) =>
      normalizeIndustry(p.slug) === normalized ||
      normalizeIndustry(p.name) === normalized ||
      p.slug.toLowerCase() === industry.toLowerCase().trim() ||
      p.name.toLowerCase() === industry.toLowerCase().trim()
  );

  if (!playbook) return null;

  const lines: string[] = [`INDUSTRY PLAYBOOK (${playbook.name}):`];
  if (playbook.overview) lines.push(`Overview: ${playbook.overview}`);

  const mapping = playbook.departmentProductMapping as DeptProductMappingRow[] | null;
  if (Array.isArray(mapping) && mapping.length > 0) {
    const productIds = new Set<string>();
    mapping.forEach((row) => row.productIds?.forEach((id) => productIds.add(id)));
    const productNames: Record<string, string> = {};
    if (productIds.size > 0) {
      const products = await prisma.catalogProduct.findMany({
        where: { id: { in: [...productIds] }, userId: playbook.userId },
        select: { id: true, name: true },
      });
      products.forEach((p) => (productNames[p.id] = p.name));
    }
    lines.push('Department → product mapping (approved products per buying group; use only these for recommendations):');
    mapping.forEach((row) => {
      const productNamesStr = (row.productIds ?? [])
        .map((id) => productNames[id] ?? id)
        .join(', ');
      const opportunity = row.typicalDealSize?.trim()
        ? ` Estimated opportunity: ${row.typicalDealSize.trim()}.`
        : '';
      if (productNamesStr) {
        lines.push(`- For the ${row.department} buying group, the approved products are: ${productNamesStr}.${opportunity}`);
      } else {
        const dealSize = row.typicalDealSize ? ` — ${row.typicalDealSize}` : '';
        lines.push(`- ${row.department}: (no products mapped)${dealSize}`);
      }
    });
  }

  const valuePropsByDept = playbook.valuePropsByDepartment as Record<string, unknown> | null;
  if (valuePropsByDept && typeof valuePropsByDept === 'object') {
    lines.push('Industry-specific value props by department:');
    for (const [dept, content] of Object.entries(valuePropsByDept)) {
      const str = Array.isArray(content)
        ? content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('; ')
        : String(content);
      if (str) lines.push(`- ${dept}: ${str}`);
    }
  }

  if (playbook.buyingCommittee) {
    lines.push('Typical buying committee:');
    lines.push(playbook.buyingCommittee);
  }

  const landmines = (playbook.landmines as string[] | null) ?? [];
  if (landmines.length > 0) {
    lines.push('Industry landmines (things to avoid):');
    landmines.forEach((l) => lines.push(`- ${l}`));
  }

  return lines.join('\n');
}

/**
 * Build a short prompt block from the user's Content Library Products (Product model).
 * Used by the chat agent for referencing products added via "Your company data" → Products.
 *
 * NOTE: This is distinct from getProductKnowledgeBlock which uses ProductProfile
 * (catalog product detailed profiles). Content generation uses getProductKnowledgeBlock;
 * this function is used by the chat agent as a lightweight fallback/supplement.
 */
export async function getContentLibraryProductsBlock(userId: string): Promise<string | null> {
  const products = await prisma.product.findMany({
    where: { userId },
    select: { name: true, description: true, category: true },
    orderBy: { name: 'asc' },
  });
  if (products.length === 0) return null;
  const lines = ['COMPANY DATA — PRODUCTS (from Your company data):'];
  for (const p of products) {
    const desc = p.description?.trim() ? ` — ${p.description}` : '';
    const cat = p.category?.trim() ? ` [${p.category}]` : '';
    lines.push(`- ${p.name}${cat}${desc}`);
  }
  return lines.join('\n');
}

/**
 * Get structured value props for a department from the user's industry playbook.
 * Returns headline, pitch, bullets, cta for use in campaign prefill and generate-draft.
 */
export async function getValuePropsForDepartment(
  userId: string,
  industry: string | null,
  department: { type: string; customName: string | null }
): Promise<DepartmentValueProps | null> {
  if (!industry?.trim()) return null;

  const normalized = normalizeIndustry(industry);
  const playbooks = await prisma.industryPlaybook.findMany({
    where: { userId },
  });
  const playbook = playbooks.find(
    (p) =>
      normalizeIndustry(p.slug) === normalized ||
      normalizeIndustry(p.name) === normalized ||
      p.slug.toLowerCase() === industry.toLowerCase().trim() ||
      p.name.toLowerCase() === industry.toLowerCase().trim()
  );
  if (!playbook?.valuePropsByDepartment) return null;

  const valuePropsByDept = playbook.valuePropsByDepartment as ValuePropsByDepartment;
  const key = getDepartmentPlaybookKey(department as { type: import('@prisma/client').DepartmentType; customName: string | null });
  const exact = valuePropsByDept[key];
  if (exact && typeof exact === 'object' && (exact.headline ?? exact.pitch)) {
    return {
      headline: String(exact.headline ?? ''),
      pitch: String(exact.pitch ?? ''),
      bullets: Array.isArray(exact.bullets) ? exact.bullets.map(String) : undefined,
      cta: typeof exact.cta === 'string' ? exact.cta : undefined,
    };
  }
  for (const [k, v] of Object.entries(valuePropsByDept)) {
    if (k.toLowerCase() === key.toLowerCase() && v && typeof v === 'object') {
      return {
        headline: String((v as DepartmentValueProps).headline ?? ''),
        pitch: String((v as DepartmentValueProps).pitch ?? ''),
        bullets: Array.isArray((v as DepartmentValueProps).bullets) ? (v as DepartmentValueProps).bullets!.map(String) : undefined,
        cta: typeof (v as DepartmentValueProps).cta === 'string' ? (v as DepartmentValueProps).cta : undefined,
      };
    }
  }
  return null;
}

/** SuccessStory content shape: optional headline, oneLiner, fullSummary, keyMetrics, whenToUse */
type SuccessStoryContent = {
  headline?: string;
  oneLiner?: string;
  fullSummary?: string;
  keyMetrics?: string[];
  whenToUse?: string;
  valueProp?: string;
};

/** Case study row for UI (Division Intelligence Cards, etc.). */
export type CaseStudyForUI = {
  title: string;
  oneLiner: string;
  industry: string | null;
  department: string | null;
};

/**
 * Return case studies as structured objects for UI (same filter logic as getCaseStudiesBlock).
 */
export async function getCaseStudiesForUI(
  userId: string,
  industry?: string | null,
  department?: string | null
): Promise<CaseStudyForUI[]> {
  const where: { userId: string; type: typeof ContentType.SuccessStory; isActive: boolean } = {
    userId,
    type: ContentType.SuccessStory,
    isActive: true,
  };

  const orConditions: Array<{ industry?: string | null; department?: string | null }> = [];
  if (industry) {
    orConditions.push({ industry }, { industry: null }, { industry: '' });
  }
  if (department) {
    orConditions.push({ department });
  }
  if (orConditions.length > 0) {
    (where as Record<string, unknown>).OR = orConditions;
  }

  const stories = await prisma.contentLibrary.findMany({
    where: { ...where, archivedAt: null },
    orderBy: [{ industry: 'desc' }, { department: 'desc' }, { title: 'asc' }],
    take: 15,
  });

  return stories.map((s) => {
    const content = (s.content as SuccessStoryContent | null) ?? {};
    const headline = content.headline ?? s.title;
    const oneLiner = content.oneLiner ?? content.valueProp ?? '';
    return {
      title: headline,
      oneLiner,
      industry: s.industry ?? null,
      department: s.department ?? null,
    };
  });
}

/**
 * Build CASE STUDIES prompt block from ContentLibrary SuccessStory, filtered by industry/department.
 * Uses getCaseStudiesForUI and formats the result for AI prompts.
 */
export async function getCaseStudiesBlock(
  userId: string,
  industry?: string | null,
  department?: string | null,
  _productIds?: string[]
): Promise<string | null> {
  const where: { userId: string; type: typeof ContentType.SuccessStory; isActive: boolean } = {
    userId,
    type: ContentType.SuccessStory,
    isActive: true,
  };

  const orConditions: Array<{ industry?: string | null; department?: string | null }> = [];
  if (industry) {
    orConditions.push({ industry }, { industry: null }, { industry: '' });
  }
  if (department) {
    orConditions.push({ department });
  }
  if (orConditions.length > 0) {
    (where as Record<string, unknown>).OR = orConditions;
  }

  const stories = await prisma.contentLibrary.findMany({
    where: { ...where, archivedAt: null },
    orderBy: [{ industry: 'desc' }, { department: 'desc' }, { title: 'asc' }],
    take: 15,
  });

  if (stories.length === 0) return null;

  const lines: string[] = ['CASE STUDIES (from Content Library, filtered by industry/department):'];

  for (const s of stories) {
    const content = (s.content as SuccessStoryContent | null) ?? {};
    const headline = content.headline ?? s.title;
    const versionLabel = (s as { version?: string | null }).version ? ` v${(s as { version?: string | null }).version}` : '';
    const oneLiner = content.oneLiner ?? content.valueProp ?? '';
    const fullSummary = content.fullSummary ?? '';
    const keyMetrics = content.keyMetrics ?? [];
    const whenToUse = content.whenToUse ?? '';

    lines.push('');
    lines.push(`--- ${headline}${versionLabel} ---`);
    if (oneLiner) lines.push(`One-liner: ${oneLiner}`);
    if (fullSummary) lines.push(`Summary: ${fullSummary}`);
    if (keyMetrics.length) {
      lines.push('Key metrics:');
      keyMetrics.forEach((m) => lines.push(`- ${m}`));
    }
    if (whenToUse) lines.push(`When to use: ${whenToUse}`);
    if (s.industry || s.department) {
      lines.push(`Tags: Industry ${s.industry ?? '—'}, Department ${s.department ?? '—'}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get catalog product IDs relevant to this industry (and optionally department) from the industry playbook.
 * Returns all product IDs from the playbook's departmentProductMapping, or empty if no playbook.
 */
export async function getRelevantProductIdsForIndustry(
  userId: string,
  industry: string | null,
  department?: string | null
): Promise<string[]> {
  if (!industry?.trim()) return [];

  const normalized = normalizeIndustry(industry);
  const playbooks = await prisma.industryPlaybook.findMany({
    where: { userId },
  });
  const playbook = playbooks.find(
    (p) =>
      normalizeIndustry(p.slug) === normalized ||
      normalizeIndustry(p.name) === normalized ||
      p.slug.toLowerCase() === industry.toLowerCase().trim() ||
      p.name.toLowerCase() === industry.toLowerCase().trim()
  );
  if (!playbook?.departmentProductMapping) return [];

  const mapping = playbook.departmentProductMapping as DeptProductMappingRow[];
  const productIds = new Set<string>();
  for (const row of mapping) {
    if (department) {
      const rowDeptNorm = normalizeIndustry(row.department);
      const deptNorm = normalizeIndustry(department);
      if (
        (rowDeptNorm && deptNorm && rowDeptNorm.includes(deptNorm)) ||
        row.department === department
      ) {
        (row.productIds ?? []).forEach((id) => productIds.add(id));
      }
    } else {
      (row.productIds ?? []).forEach((id) => productIds.add(id));
    }
  }
  return [...productIds];
}

/** CompanyEvent content shape */
type CompanyEventContent = {
  eventDate?: string;
  eventType?: string;
  description?: string;
  registrationUrl?: string;
  targetAudience?: string[];
  location?: string;
  topics?: string[];
  primaryTopic?: string; // Main topic/interest category (e.g., "Autonomous Vehicles", "AI Factories")
  speakers?: string[];
  industries?: string[];
};

export type EventMatchingContext = {
  activeObjections?: string[];
  existingProducts?: string[];
};

/**
 * Tokenise a phrase into lowercase keywords (>=3 chars) for fuzzy matching.
 * Strips common filler words to improve signal.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'our', 'their', 'they', 'too', 'not', 'about', 'into', 'how']);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

/**
 * Score how well an event's searchable text matches a set of keywords.
 * Returns the number of distinct keyword hits.
 */
function scoreTextMatch(eventText: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const lower = eventText.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw)).length;
}

/**
 * Build COMPANY EVENTS prompt block from ContentLibrary CompanyEvent.
 * Filters by industry/department/role and ranks by relevance to the account's
 * active objections and existing products when provided.
 */
export async function getCompanyEventsBlock(
  userId: string,
  industry?: string | null,
  department?: string | null,
  role?: string | null,
  matchingContext?: EventMatchingContext
): Promise<string | null> {
  const where: { userId: string; type: typeof ContentType.CompanyEvent; isActive: boolean } = {
    userId,
    type: ContentType.CompanyEvent,
    isActive: true,
  };

  const orConditions: Array<{ industry?: string | null; department?: string | null; persona?: string | null }> = [];
  if (industry) {
    orConditions.push({ industry }, { industry: null }, { industry: '' });
  }
  if (department) {
    orConditions.push({ department });
    orConditions.push({ persona: department });
  }
  if (orConditions.length > 0) {
    (where as Record<string, unknown>).OR = orConditions;
  }

  const events = await prisma.contentLibrary.findMany({
    where: { ...where, archivedAt: null },
    orderBy: [
      { persona: 'desc' },
      { industry: 'desc' },
      { department: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
  });

  if (events.length === 0) return null;

  // --- Phase 1: tag-based filtering (department + role) ---
  let filteredEvents = events;
  if (department) {
    const deptLower = department.toLowerCase();
    filteredEvents = events.filter((event) => {
      const content = (event.content as CompanyEventContent | null) ?? {};
      const primaryTopic = content.primaryTopic || event.persona || '';
      const topics = content.topics || [];
      return (
        primaryTopic.toLowerCase().includes(deptLower) ||
        deptLower.includes(primaryTopic.toLowerCase()) ||
        topics.some((t) => t.toLowerCase().includes(deptLower) || deptLower.includes(t.toLowerCase())) ||
        event.department?.toLowerCase().includes(deptLower)
      );
    });
    if (filteredEvents.length === 0) filteredEvents = events;
  }

  if (role) {
    const roleLower = role.toLowerCase();
    const roleFiltered = filteredEvents.filter((event) => {
      const content = (event.content as CompanyEventContent | null) ?? {};
      const targetAudience = content.targetAudience || [];
      return targetAudience.some(
        (audience) => audience.toLowerCase().includes(roleLower) || roleLower.includes(audience.toLowerCase())
      );
    });
    if (roleFiltered.length > 0) {
      filteredEvents = roleFiltered;
    } else if (department) {
      const deptLower = department.toLowerCase();
      filteredEvents = events.filter((event) => {
        const content = (event.content as CompanyEventContent | null) ?? {};
        const primaryTopic = content.primaryTopic || event.persona || '';
        return (
          primaryTopic.toLowerCase().includes(deptLower) ||
          deptLower.includes(primaryTopic.toLowerCase())
        );
      });
    }
  }

  // --- Phase 2: objection & product relevance scoring ---
  const objectionKeywords = (matchingContext?.activeObjections ?? []).flatMap(extractKeywords);
  const productKeywords = (matchingContext?.existingProducts ?? []).flatMap(extractKeywords);
  const hasContextScoring = objectionKeywords.length > 0 || productKeywords.length > 0;

  type ScoredEvent = { event: typeof filteredEvents[number]; score: number; matchReasons: string[] };

  const scored: ScoredEvent[] = filteredEvents.map((event) => {
    const content = (event.content as CompanyEventContent | null) ?? {};
    const searchableText = [
      event.title,
      content.primaryTopic || event.persona || '',
      content.description || '',
      ...(content.topics || []),
    ].join(' ');

    let score = 0;
    const matchReasons: string[] = [];

    if (hasContextScoring) {
      const objScore = scoreTextMatch(searchableText, objectionKeywords);
      const prodScore = scoreTextMatch(searchableText, productKeywords);

      if (objScore > 0) {
        score += objScore * 3;
        matchReasons.push('addresses account objections');
      }
      if (prodScore > 0) {
        score += prodScore * 2;
        matchReasons.push('relates to existing stack');
      }
    }

    return { event, score, matchReasons };
  });

  if (hasContextScoring) {
    scored.sort((a, b) => b.score - a.score);
  }

  // --- Phase 3: format output ---
  const lines: string[] = ['COMPANY EVENTS & SESSIONS (for invitations and recommendations):'];
  if (hasContextScoring) {
    lines.push('Events are ranked by relevance to this account\'s objections and existing products.');
  }

  for (const { event, matchReasons } of scored.slice(0, 15)) {
    const content = (event.content as CompanyEventContent | null) ?? {};
    const eventDate = content.eventDate || '';
    const eventType = content.eventType || 'event';
    const description = content.description || event.title;
    const registrationUrl = content.registrationUrl || '';
    const location = content.location || '';
    const primaryTopic = content.primaryTopic || event.persona || '';
    const topics = content.topics || [];
    const speakers = content.speakers || [];
    const industries = content.industries || [];

    lines.push('');
    lines.push(`--- ${event.title} ---`);
    if (matchReasons.length > 0) {
      lines.push(`Account Relevance: ${matchReasons.join('; ')}`);
    }
    if (primaryTopic) lines.push(`Primary Topic/Interest: ${primaryTopic}`);
    if (eventDate) lines.push(`Date: ${eventDate}`);
    if (eventType) lines.push(`Type: ${eventType}`);
    if (description) lines.push(`Description: ${description}`);
    if (topics.length) lines.push(`Topics: ${topics.join(', ')}`);
    if (speakers.length) lines.push(`Speakers: ${speakers.join(', ')}`);
    if (industries.length) lines.push(`Industries: ${industries.join(', ')}`);
    if (location) lines.push(`Location: ${location}`);
    if (registrationUrl) lines.push(`Registration: ${registrationUrl}`);
    if (event.industry || event.department) {
      lines.push(`Tags: Industry ${event.industry ?? '—'}, Department ${event.department ?? '—'}`);
    }
  }

  return lines.join('\n');
}

/**
 * Load active objection texts for an account (lightweight, for event matching).
 */
export async function getActiveObjectionTexts(
  companyId: string,
  userId: string
): Promise<string[]> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });
  const raw = (company as Record<string, unknown> | null)?.activeObjections;
  if (!Array.isArray(raw)) return [];
  return (raw as Array<{ objection?: string; status?: string }>)
    .filter((o) => o.status === 'active' && o.objection)
    .map((o) => o.objection as string);
}

/**
 * Load existing product names for an account (lightweight, for event matching).
 */
export async function getExistingProductNames(
  companyId: string,
  userId: string
): Promise<string[]> {
  const products = await prisma.companyProduct.findMany({
    where: { companyId, company: { userId }, status: { in: ['ACTIVE', 'TRIAL'] } },
    select: { product: { select: { name: true } } },
  });
  return products.map((p) => p.product.name);
}

/** FeatureRelease content shape */
type FeatureReleaseContent = {
  releaseDate?: string;
  version?: string;
  features?: string[];
  benefits?: string[];
  targetAudience?: string[];
  relatedProducts?: string[];
};

/**
 * Build FEATURE RELEASES prompt block from ContentLibrary FeatureRelease.
 * Useful for sharing latest product updates and announcements.
 */
export async function getFeatureReleasesBlock(
  userId: string,
  industry?: string | null,
  limit: number = 10
): Promise<string | null> {
  const where: { userId: string; type: typeof ContentType.FeatureRelease; isActive: boolean } = {
    userId,
    type: ContentType.FeatureRelease,
    isActive: true,
  };

  const releases = await prisma.contentLibrary.findMany({
    where: { ...where, archivedAt: null },
    orderBy: [
      { createdAt: 'desc' }, // Most recent first
    ],
    take: limit,
  });

  if (releases.length === 0) return null;

  const lines: string[] = ['FEATURE RELEASES & PRODUCT ANNOUNCEMENTS:'];

  for (const release of releases) {
    const content = (release.content as FeatureReleaseContent | null) ?? {};
    const releaseDate = content.releaseDate || '';
    const version = content.version || '';
    const features = content.features || [];
    const benefits = content.benefits || [];
    const relatedProducts = content.relatedProducts || [];

    lines.push('');
    lines.push(`--- ${release.title} ---`);
    if (releaseDate) lines.push(`Release Date: ${releaseDate}`);
    if (version) lines.push(`Version: ${version}`);
    if (features.length) {
      lines.push('Features:');
      features.forEach((f) => lines.push(`- ${f}`));
    }
    if (benefits.length) {
      lines.push('Benefits:');
      benefits.forEach((b) => lines.push(`- ${b}`));
    }
    if (relatedProducts.length) {
      lines.push(`Related Products: ${relatedProducts.join(', ')}`);
    }
    if (release.sourceUrl) lines.push(`Source: ${release.sourceUrl}`);
  }

  return lines.join('\n');
}
