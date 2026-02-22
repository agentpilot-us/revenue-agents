'use server';

import pLimit from 'p-limit';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { findContactsForSegment } from '@/lib/tools/contact-finder';
import { enrichContact } from '@/lib/tools/clay';
import { generateWhyRelevant } from '@/lib/contacts/why-relevant';
import { matchPersona } from '@/app/actions/match-persona';
import { DepartmentType } from '@prisma/client';

export type ContactTypeOption = 'economic' | 'technical' | 'program' | 'influencer';
export type SearchScopeOption = 'linkedin' | 'clay' | 'zoominfo';

export type FoundContact = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  linkedinUrl: string;
  email?: string;
  phone?: string;
  emailVerified?: boolean;
  personaId?: string;
  personaName?: string;
  confidence?: number;
  whyRelevant?: string;
};

export type FindContactsResult = {
  ok: true;
  steps: Array<{ step: string; detail: string }>;
  results: FoundContact[];
} | {
  ok: false;
  error: string;
};

export async function findContactsForDepartment(
  companyId: string,
  departmentId: string,
  _contactTypes: ContactTypeOption[],
  scope: { linkedin?: boolean; clay?: boolean; zoominfo?: boolean }
): Promise<FindContactsResult> {
  const company = await prisma.company.findFirst({
    where: { id: companyId },
    select: { id: true, name: true, domain: true, website: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const department = await prisma.companyDepartment.findFirst({
    where: { id: departmentId, companyId },
    select: { id: true, type: true, customName: true, targetRoles: true },
  });
  if (!department) return { ok: false, error: 'Department not found' };

  const steps: Array<{ step: string; detail: string }> = [];
  const useFinder = scope.linkedin !== false;
  const useClay = scope.clay === true;
  const useZoomInfo = scope.zoominfo === true;

  if (useFinder) {
    const rawDomain =
      company.domain?.trim() ||
      company.website?.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')?.trim() ||
      '';
    const companyDomain =
      rawDomain || `${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
    const targetRoles = flattenTargetRoles(
      department.targetRoles as { economicBuyer?: string[]; technicalEvaluator?: string[]; champion?: string[]; influencer?: string[] } | null
    );

    let segmentResults;
    try {
      segmentResults = await findContactsForSegment({
        companyDomain,
        companyName: company.name,
        targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
        maxResults: 15,
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Contact search failed' };
    }

    steps.push({
      step: 'search',
      detail: `Searched contacts (found ${segmentResults.length} matches)`,
    });

    const deptType = department.type as DepartmentType;
    const results: FoundContact[] = [];
    let enriched = 0;

    for (let i = 0; i < segmentResults.length; i++) {
      const c = segmentResults[i];
      let email: string | undefined = c.email;
      let phone: string | undefined;
      let emailVerified = false;

      if (useClay && c.linkedinUrl) {
        const enrichResult = await enrichContact({
          linkedinUrl: c.linkedinUrl,
          domain: company.domain ?? undefined,
        });
        if (enrichResult.ok && enrichResult.data) {
          enriched++;
          email = (enrichResult.data.email as string) ?? email;
          phone = (enrichResult.data.phone as string) ?? undefined;
          emailVerified = (enrichResult.data.verified as boolean) ?? !!email;
        }
      }
      if (useZoomInfo && !email) {
        // Placeholder: ZoomInfo stub not implemented; could add later
      }

      let personaId: string | undefined;
      let personaName: string | undefined;
      let confidence: number | undefined;
      let whyRelevant: string | undefined;
      try {
        const match = await matchPersona({
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          companyName: company.name,
          departmentType: deptType,
        });
        personaId = match.personaId;
        personaName = match.personaName;
        confidence = match.confidence;
        whyRelevant = match.reasoning;
      } catch {
        // optional
      }

      results.push({
        id: `found-${i}-${Date.now()}`,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        linkedinUrl: c.linkedinUrl ?? '',
        email,
        phone,
        emailVerified,
        personaId,
        personaName,
        confidence,
        whyRelevant,
      });
    }

    if (useClay && results.length > 0) {
      steps.push({
        step: 'clay',
        detail: `Enriched with Clay (${enriched} of ${results.length})`,
      });
    }

    return { ok: true, steps, results };
  }

  return { ok: false, error: 'At least one search scope is required.' };
}

function flattenTargetRoles(
  targetRoles: { economicBuyer?: string[]; technicalEvaluator?: string[]; champion?: string[]; influencer?: string[] } | null
): string[] {
  if (!targetRoles || typeof targetRoles !== 'object') return [];
  const out: string[] = [];
  for (const key of ['economicBuyer', 'technicalEvaluator', 'champion', 'influencer'] as const) {
    const arr = targetRoles[key];
    if (Array.isArray(arr)) out.push(...arr.filter((t): t is string => typeof t === 'string'));
  }
  return [...new Set(out)];
}

export type AddContactsInput = {
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  personaId?: string;
};

export type AddContactsResult = {
  ok: true;
  added: number;
  skipped: number;
  contactIds: string[];
} | {
  ok: false;
  error: string;
};

export async function addContactsToDepartment(
  companyId: string,
  departmentId: string,
  contacts: AddContactsInput[]
): Promise<AddContactsResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const department = await prisma.companyDepartment.findFirst({
    where: { id: departmentId, companyId },
  });
  if (!department) return { ok: false, error: 'Department not found' };

  const contactIds: string[] = [];
  let added = 0;
  let skipped = 0;

  for (const c of contacts) {
    const email = c.email?.trim() || null;
    if (email) {
      const existing = await prisma.contact.findUnique({
        where: {
          email_companyId: { email, companyId },
        },
      });
      if (existing) {
        if (!existing.companyDepartmentId) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: { companyDepartmentId: departmentId },
          });
          contactIds.push(existing.id);
          added++;
        } else {
          skipped++;
        }
        continue;
      }
    }

    const enrichmentStatus =
      (c.linkedinUrl ?? c.email) ? 'pending' : 'not_needed';
    const created = await prisma.contact.create({
      data: {
        companyId,
        companyDepartmentId: departmentId,
        firstName: c.firstName || null,
        lastName: c.lastName || null,
        email: email ?? null,
        phone: c.phone ?? null,
        title: c.title ?? null,
        linkedinUrl: c.linkedinUrl ?? null,
        personaId: c.personaId ?? null,
        enrichmentStatus,
      },
    });
    contactIds.push(created.id);
    added++;
  }

  return { ok: true, added, skipped, contactIds };
}

const MAX_DEPARTMENT_CONCURRENCY = 3;
const DEFAULT_MAX_PER_DEPT = 10;

export type FindAndEnrichProgress =
  | { type: 'started'; departmentCount: number }
  | { type: 'department'; departmentId: string; departmentName: string; contactsAdded: number }
  | { type: 'enriching'; processed: number; enriched: number }
  | { type: 'complete'; departmentsProcessed: number; contactsAdded: number; enriched: number; failed: number }
  | { type: 'error'; message: string };

export type FindAndEnrichOptions = {
  departmentIds?: string[];
  maxPerDept?: number;
  scope?: { linkedin?: boolean; clay?: boolean };
  /** If provided, progress events are sent here (e.g. for SSE). */
  onProgress?: (event: FindAndEnrichProgress) => void;
};

/**
 * Find contacts for all (or selected) departments and add them; then trigger enrichment.
 * Uses pLimit(3) for department concurrency. Optionally streams progress via onProgress.
 */
export async function findAndEnrichContactsForCompany(
  companyId: string,
  options: FindAndEnrichOptions = {}
): Promise<
  | { ok: true; departmentsProcessed: number; contactsAdded: number; enriched: number; failed: number }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true, domain: true, website: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const departments = await prisma.companyDepartment.findMany({
    where: {
      companyId,
      ...(options.departmentIds?.length ? { id: { in: options.departmentIds } } : {}),
    },
    select: { id: true, type: true, customName: true, targetRoles: true },
    orderBy: { createdAt: 'asc' },
  });

  const maxPerDept = options.maxPerDept ?? DEFAULT_MAX_PER_DEPT;
  const scope = options.scope ?? { linkedin: true, clay: true };
  const send = options.onProgress ?? (() => {});

  send({ type: 'started', departmentCount: departments.length });

  const limit = pLimit(MAX_DEPARTMENT_CONCURRENCY);
  let totalAdded = 0;

  const rawDomain =
    company.domain?.trim() ||
    company.website?.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')?.trim() ||
    '';
  const companyDomain =
    rawDomain || `${company.name.toLowerCase().replace(/\s+/g, '')}.com`;

  for (const dept of departments) {
    try {
      const targetRoles = flattenTargetRoles(
        dept.targetRoles as { economicBuyer?: string[]; technicalEvaluator?: string[]; champion?: string[]; influencer?: string[] } | null
      );
      const segmentResults = await limit(() =>
        findContactsForSegment({
          companyDomain,
          companyName: company.name,
          targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
          maxResults: maxPerDept,
        })
      );

      const toAdd: AddContactsInput[] = segmentResults.map((c) => ({
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        email: c.email,
        linkedinUrl: c.linkedinUrl,
      }));

      const addResult = await addContactsToDepartment(companyId, dept.id, toAdd);
      if (addResult.ok) {
        totalAdded += addResult.added;
        send({
          type: 'department',
          departmentId: dept.id,
          departmentName: dept.customName || dept.type,
          contactsAdded: addResult.added,
        });
      }
    } catch (e) {
      send({
        type: 'error',
        message: e instanceof Error ? e.message : 'Find contacts failed',
      });
    }
  }

  let enriched = 0;
  let failed = 0;
  const maxEnrichRounds = 20;
  for (let round = 0; round < maxEnrichRounds; round++) {
    const pending = await prisma.contact.count({
      where: { companyId, enrichmentStatus: 'pending' },
    });
    if (pending === 0) break;
    const batchSize = 10;
    const toProcess = await prisma.contact.findMany({
      where: { companyId, enrichmentStatus: 'pending' },
      take: batchSize,
      select: {
        id: true,
        email: true,
        linkedinUrl: true,
        firstName: true,
        lastName: true,
        title: true,
        companyDepartmentId: true,
      },
    });
    for (const c of toProcess) {
      await prisma.contact.update({
        where: { id: c.id },
        data: { enrichmentStatus: 'enriching' },
      });
      const result = await enrichContact({
        email: c.email ?? undefined,
        linkedinUrl: c.linkedinUrl ?? undefined,
        domain: company.domain ?? undefined,
      });
      if (result.ok && result.data) {
        const enrichedData = result.data as Record<string, unknown>;
        let whyRelevant: string | undefined;
        if (c.companyDepartmentId) {
          try {
            const dept = await prisma.companyDepartment.findUnique({
              where: { id: c.companyDepartmentId },
              select: { customName: true, type: true, valueProp: true, useCase: true },
            });
            if (dept) {
              whyRelevant = await generateWhyRelevant({
                contactTitle: (result.data.title as string) ?? c.title ?? '',
                departmentName: dept.customName ?? dept.type.replace(/_/g, ' '),
                companyName: company.name,
                valueProp: dept.valueProp ?? null,
                useCase: dept.useCase ?? null,
              });
            }
          } catch {
            // optional
          }
        }
        if (whyRelevant) enrichedData.whyRelevant = whyRelevant;
        await prisma.contact.update({
          where: { id: c.id },
          data: {
            enrichmentStatus: 'complete',
            enrichedAt: new Date(),
            enrichedData: enrichedData as object,
            ...(result.data.email ? { email: String(result.data.email) } : {}),
            ...(result.data.phone ? { phone: String(result.data.phone) } : {}),
            ...(result.data.title ? { title: String(result.data.title) } : {}),
          },
        });
        enriched++;
      } else {
        await prisma.contact.update({
          where: { id: c.id },
          data: {
            enrichmentStatus: 'failed',
            enrichedAt: new Date(),
            enrichedData: { error: result.ok ? undefined : (result as { error: string }).error },
          },
        });
        failed++;
      }
    }
    send({ type: 'enriching', processed: totalAdded, enriched });
  }

  send({
    type: 'complete',
    departmentsProcessed: departments.length,
    contactsAdded: totalAdded,
    enriched,
    failed,
  });

  return {
    ok: true,
    departmentsProcessed: departments.length,
    contactsAdded: totalAdded,
    enriched,
    failed,
  };
}
