/**
 * Post-create enrichment: run company research + contact discovery after company creation.
 * Persists AccountSignals and Contacts; updates company enrichment completion timestamps.
 */

import Exa from 'exa-js';
import { prisma } from '@/lib/db';
import { fetchAccountSignals } from '@/lib/signals/fetch-account-signals';
import { TYPE_DEDUP_DAYS } from '@/lib/signals/constants';
import { createCompanyWebset } from '@/lib/exa/websets';

const exa = process.env.EXA_API_KEY ? new Exa(process.env.EXA_API_KEY) : null;

export type EnrichCompanyResult = {
  signalsFound: number;
  contactsFound: number;
  error?: string;
};

/** Optional caps for Stradex free-brief / cost-controlled enrichment */
export type EnrichCompanyOptions = {
  /** Max LinkedIn people rows to persist (default 20) */
  maxPeopleResults?: number;
  /** Signal search lookback in hours (default 168 in caller) */
  signalLookbackHours?: number;
  /** Stop persisting signals after this many (default: unlimited) */
  maxSignalsToPersist?: number;
  /** Skip Exa webset creation (saves follow-on monitoring setup for one-off briefs) */
  skipWebset?: boolean;
};

type ExaPeopleResult = {
  title: string | null;
  url: string;
  text?: string;
};

function normalizePeopleResults(response: { results?: ExaPeopleResult[] }): ExaPeopleResult[] {
  const results = response.results ?? [];
  return results.filter((r) => r?.url);
}

/**
 * Infer department (legacy string) from job title for contact grouping.
 */
function inferDepartmentFromTitle(title: string | null): string | null {
  if (!title || !title.trim()) return null;
  const t = title.toLowerCase();
  if (t.includes('revenue') || t.includes('revops') || t.includes('sales ops')) return 'Revenue Operations';
  if (t.includes('sales')) return 'Sales';
  if (t.includes('engineering') || t.includes('software')) return 'Engineering';
  if (t.includes('product')) return 'Product';
  if (t.includes('customer success') || t.includes('cs ')) return 'Customer Success';
  if (t.includes('finance') || t.includes('cfo') || t.includes('controller')) return 'Finance';
  if (t.includes('it ') || t.includes(' information technology')) return 'IT';
  if (t.includes('marketing')) return 'Marketing';
  if (t.includes('people') || t.includes('hr ') || t.includes('human resources')) return 'People';
  if (t.includes('executive') || t.includes('ceo') || t.includes('chief')) return 'Executive';
  return null;
}

/**
 * Parse "Name - Title" or "Title at Company" or "Name" from search result title/text.
 */
function parseNameAndTitle(
  title: string | null,
  text: string | undefined
): { firstName: string; lastName: string; title: string } | null {
  const raw = (title ?? '') || (text ?? '').slice(0, 200) || '';
  if (!raw.trim()) return null;

  // Common pattern: "FirstName LastName - Title" or "FirstName LastName | Title"
  const dashMatch = raw.match(/^([^\-|]+)[\-|]\s*(.+)$/);
  if (dashMatch) {
    const namePart = dashMatch[1].trim();
    const titlePart = dashMatch[2].trim();
    const name = parseName(namePart);
    if (name) return { ...name, title: titlePart };
  }

  // "Title at Company" -> use rest as title
  const atMatch = raw.match(/^(.+?)\s+at\s+.+$/i);
  if (atMatch) {
    const name = parseName(atMatch[1].trim());
    if (name) return { ...name, title: atMatch[1].trim() };
  }

  const name = parseName(raw);
  if (name) return { ...name, title: raw };
  return null;
}

function parseName(full: string): { firstName: string; lastName: string } | null {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts.pop()!;
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

/**
 * Guess email from first name, last name, domain (e.g. firstname.lastname@domain.com).
 */
function guessEmail(firstName: string, lastName: string, domain: string | null): string | null {
  if (!domain || !firstName) return null;
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const first = clean(firstName);
  const last = clean(lastName);
  const base = domain.replace(/^https?:\/\//, '').split('/')[0].trim();
  if (!base) return null;
  if (last) return `${first}.${last}@${base}`;
  return `${first}@${base}`;
}

/**
 * Run web enrichment for a company: signals (news/exec/financial) + people (LinkedIn).
 * Call after company create; runs async. Sets enrichment started/completed timestamps.
 */
export async function enrichCompanyWithExa(
  companyId: string,
  options?: EnrichCompanyOptions
): Promise<EnrichCompanyResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, domain: true, industry: true, userId: true, isDemoAccount: true },
  });

  if (!company) throw new Error('Company not found');
  if (company.isDemoAccount) return { signalsFound: 0, contactsFound: 0 };

  await prisma.company.update({
    where: { id: companyId },
    data: { exaEnrichmentStartedAt: new Date() },
  });

  let signalsFound = 0;
  let contactsFound = 0;

  try {
    // 1. Fetch account signals (news, earnings, exec) — reuse existing fetcher (7-day lookback for initial)
    const lookbackHours = options?.signalLookbackHours ?? 168;
    const signalResult = await fetchAccountSignals(
      company.name,
      company.domain ?? '',
      company.industry,
      lookbackHours
    );
    const maxSignals = options?.maxSignalsToPersist;

    const publishedAtFallback = new Date();
    for (const signal of signalResult.signals) {
      const existingByUrl = await prisma.accountSignal.findFirst({
        where: { companyId: company.id, url: signal.url },
      });
      if (existingByUrl) continue;

      const dedupDays = TYPE_DEDUP_DAYS[signal.type];
      if (dedupDays != null) {
        const since = new Date();
        since.setDate(since.getDate() - dedupDays);
        const existingByType = await prisma.accountSignal.findFirst({
          where: {
            companyId: company.id,
            type: signal.type,
            publishedAt: { gte: since },
          },
        });
        if (existingByType) continue;
      }

      const publishedAt = new Date(signal.publishedAt);
      if (isNaN(publishedAt.getTime())) publishedAt.setTime(publishedAtFallback.getTime());

      await prisma.accountSignal.create({
        data: {
          companyId: company.id,
          userId: company.userId,
          type: signal.type,
          title: signal.title,
          summary: signal.summary,
          url: signal.url,
          publishedAt,
          relevanceScore: signal.relevanceScore,
          suggestedPlay: signal.suggestedPlay ?? null,
          status: 'new',
        },
      });
      signalsFound++;
      if (maxSignals != null && signalsFound >= maxSignals) break;
    }
  } catch (err) {
    console.warn('Enrich company signals error:', err);
  }

  // 2. Find decision makers via people/LinkedIn search
  if (exa) {
    try {
      const domainFilter = company.domain
        ? ` at ${company.name} OR ${company.domain}`
        : ` at ${company.name}`;
      const numPeople = options?.maxPeopleResults ?? 20;
      const peopleRes = await exa.search(
        `${company.name} VP Director "Revenue Operations" OR "Sales Operations" OR "Engineering" OR "Product" OR "Customer Success"${domainFilter}`,
        {
          numResults: numPeople,
          category: 'people',
          includeDomains: ['linkedin.com'],
          contents: { text: { maxCharacters: 500 } },
        }
      );

      const peopleResults = normalizePeopleResults(peopleRes as { results?: ExaPeopleResult[] });
      const seenUrls = new Set<string>();

      for (const result of peopleResults) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        const parsed = parseNameAndTitle(result.title ?? null, result.text);
        if (!parsed) continue;

        const existingByLinkedIn = await prisma.contact.findFirst({
          where: { companyId: company.id, linkedinUrl: result.url },
        });
        if (existingByLinkedIn) continue;

        const email = guessEmail(parsed.firstName, parsed.lastName, company.domain);
        const department = inferDepartmentFromTitle(parsed.title);

        await prisma.contact.create({
          data: {
            companyId: company.id,
            firstName: parsed.firstName,
            lastName: parsed.lastName || null,
            title: parsed.title || null,
            email,
            linkedinUrl: result.url,
            department,
            enrichmentStatus: 'complete',
            enrichedAt: new Date(),
          },
        });
        contactsFound++;
      }
    } catch (err) {
      console.warn('Enrich company contacts error:', err);
    }
  }

  // Create persistent webset for ongoing signal monitoring (skip for one-off Stradex briefs)
  let exaWebsetId: string | null = null;
  if (!options?.skipWebset) {
    try {
      exaWebsetId = await createCompanyWebset(company.name, company.industry);
    } catch (err) {
      console.warn('Webset creation error during enrichment:', err);
    }
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      exaEnrichmentCompletedAt: new Date(),
      ...(exaWebsetId ? { exaWebsetId } : {}),
    },
  });

  return { signalsFound, contactsFound };
}
