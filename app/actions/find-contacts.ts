'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { searchLinkedInContacts } from '@/lib/tools/phantombuster';
import { enrichContact } from '@/lib/tools/clay';
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
    select: { id: true, name: true, domain: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const department = await prisma.companyDepartment.findFirst({
    where: { id: departmentId, companyId },
    select: { id: true, type: true, customName: true },
  });
  if (!department) return { ok: false, error: 'Department not found' };

  const steps: Array<{ step: string; detail: string }> = [];
  const useLinkedIn = scope.linkedin !== false;
  const useClay = scope.clay === true;
  const useZoomInfo = scope.zoominfo === true;

  if (useLinkedIn) {
    const searchResult = await searchLinkedInContacts({
      companyName: company.name,
      companyDomain: company.domain ?? undefined,
      limit: 15,
    });
    if (!searchResult.ok) {
      return { ok: false, error: searchResult.error };
    }
    steps.push({
      step: 'linkedin',
      detail: `Searched LinkedIn (found ${searchResult.contacts.length} matches)`,
    });

    const deptType = department.type as DepartmentType;
    const results: FoundContact[] = [];
    let enriched = 0;

    for (let i = 0; i < searchResult.contacts.length; i++) {
      const c = searchResult.contacts[i];
      const nameParts = (c.name ?? 'Unknown').trim().split(/\s+/);
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || '';
      let email: string | undefined;
      let phone: string | undefined;
      let emailVerified = false;

      if (useClay && c.url) {
        const enrichResult = await enrichContact({
          linkedinUrl: c.url,
          domain: company.domain ?? undefined,
        });
        if (enrichResult.ok && enrichResult.data) {
          enriched++;
          email = (enrichResult.data.email as string) ?? undefined;
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
          firstName,
          lastName,
          title: c.title ?? '',
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
        firstName,
        lastName,
        title: c.title ?? '',
        linkedinUrl: c.url ?? '',
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

  return { ok: false, error: 'At least one search scope (LinkedIn) is required.' };
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
      },
    });
    contactIds.push(created.id);
    added++;
  }

  return { ok: true, added, skipped, contactIds };
}
