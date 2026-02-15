import { prisma } from '@/lib/db';
import { ContentType } from '@prisma/client';

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
    lines.push('Standard departments & product mapping:');
    const productIds = new Set<string>();
    mapping.forEach((row) => row.productIds?.forEach((id) => productIds.add(id)));
    const productNames: Record<string, string> = {};
    if (productIds.size > 0) {
      const products = await prisma.catalogProduct.findMany({
        where: { id: { in: [...productIds] } },
        select: { id: true, name: true },
      });
      products.forEach((p) => (productNames[p.id] = p.name));
    }
    mapping.forEach((row) => {
      const productNamesStr = (row.productIds ?? [])
        .map((id) => productNames[id] ?? id)
        .join(', ');
      const dealSize = row.typicalDealSize ? ` — ${row.typicalDealSize}` : '';
      lines.push(`- ${row.department}: ${productNamesStr || '—'}${dealSize}`);
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

/** SuccessStory content shape: optional headline, oneLiner, fullSummary, keyMetrics, whenToUse */
type SuccessStoryContent = {
  headline?: string;
  oneLiner?: string;
  fullSummary?: string;
  keyMetrics?: string[];
  whenToUse?: string;
  valueProp?: string;
};

/**
 * Build CASE STUDIES prompt block from ContentLibrary SuccessStory, filtered by industry/department.
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

/**
 * Build COMPANY EVENTS prompt block from ContentLibrary CompanyEvent, filtered by industry/department/role.
 * Useful for recommending sessions/events to contacts.
 */
export async function getCompanyEventsBlock(
  userId: string,
  industry?: string | null,
  department?: string | null,
  role?: string | null
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
    // Also match by persona field (which stores primaryTopic for GTC sessions)
    orConditions.push({ persona: department });
  }
  if (orConditions.length > 0) {
    (where as Record<string, unknown>).OR = orConditions;
  }

  const events = await prisma.contentLibrary.findMany({
    where: { ...where, archivedAt: null },
    orderBy: [
      { persona: 'desc' }, // Primary topic first
      { industry: 'desc' },
      { department: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50, // Get more events since we'll filter by topic/role
  });

  if (events.length === 0) return null;

  // Filter events by primary topic (persona field) and role/targetAudience
  let filteredEvents = events;
  if (department) {
    // Match by primary topic (stored in persona field) or department
    const deptLower = department.toLowerCase();
    filteredEvents = events.filter((event) => {
      const content = (event.content as CompanyEventContent | null) ?? {};
      const primaryTopic = content.primaryTopic || event.persona || '';
      const topics = content.topics || [];
      
      // Check if department matches primary topic or any topic
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
    filteredEvents = filteredEvents.filter((event) => {
      const content = (event.content as CompanyEventContent | null) ?? {};
      const targetAudience = content.targetAudience || [];
      return targetAudience.some(
        (audience) => audience.toLowerCase().includes(roleLower) || roleLower.includes(audience.toLowerCase())
      );
    });
    // If no matches, keep the topic-filtered events
    if (filteredEvents.length === 0 && department) {
      // Revert to topic-filtered only
      filteredEvents = events.filter((event) => {
        const content = (event.content as CompanyEventContent | null) ?? {};
        const primaryTopic = content.primaryTopic || event.persona || '';
        const deptLower = department.toLowerCase();
        return (
          primaryTopic.toLowerCase().includes(deptLower) ||
          deptLower.includes(primaryTopic.toLowerCase())
        );
      });
    }
  }

  const lines: string[] = ['COMPANY EVENTS & SESSIONS (for invitations and recommendations):'];

  for (const event of filteredEvents.slice(0, 15)) {
    const content = (event.content as CompanyEventContent | null) ?? {};
    const eventDate = content.eventDate || '';
    const eventType = content.eventType || 'event';
    const description = content.description || event.title;
    const registrationUrl = content.registrationUrl || '';
    const location = content.location || '';
    const primaryTopic = content.primaryTopic || event.persona || ''; // Use primaryTopic or persona field
    const topics = content.topics || [];
    const speakers = content.speakers || [];
    const industries = content.industries || [];

    lines.push('');
    lines.push(`--- ${event.title} ---`);
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
