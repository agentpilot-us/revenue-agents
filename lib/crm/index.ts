export * from './types';
export * from './hubspot';
export * from './salesforce';

import type { CrmSource, CrmImportResult, CrmPushResult } from './types';
import type { PrismaClient } from '@prisma/client';
import { hubspotFetchContacts, hubspotPushActivity, isHubSpotConfigured } from './hubspot';
import { salesforceFetchContacts, salesforcePushActivity, salesforcePushSegmentUpdates, isSalesforceConfigured } from './salesforce';

export function isCrmConfigured(source: CrmSource): boolean {
  return source === 'hubspot' ? isHubSpotConfigured() : isSalesforceConfigured();
}

/**
 * Find or create an AgentPilot Company from a CRM account id. Returns company id.
 */
async function getOrCreateCompanyFromCrmAccount(
  prisma: PrismaClient,
  userId: string,
  crmSource: CrmSource,
  crmAccountId: string,
  accountName: string,
  domain?: string | null,
  website?: string | null
): Promise<string> {
  const existing = await prisma.company.findFirst({
    where: {
      userId,
      crmSource,
      ...(crmSource === 'salesforce' ? { salesforceId: crmAccountId } : { hubspotId: crmAccountId }),
    },
    select: { id: true },
  });
  if (existing) return existing.id;
  const company = await prisma.company.create({
    data: {
      userId,
      name: accountName || crmAccountId,
      domain: domain ?? null,
      website: website ?? null,
      crmSource,
      ...(crmSource === 'salesforce' ? { salesforceId: crmAccountId } : { hubspotId: crmAccountId }),
    },
  });
  return company.id;
}

/**
 * Import contacts from CRM into AgentPilot: match or create Company, create or update Contact.
 */
export async function crmImportContacts(
  prisma: PrismaClient,
  userId: string,
  params: {
    crmSource: CrmSource;
    companyId?: string; // existing AgentPilot company to attach contacts to
    accountId?: string; // CRM account/company id to filter by (Salesforce AccountId or HubSpot company id)
    limit?: number;
  }
): Promise<CrmImportResult> {
  const { crmSource, companyId: existingCompanyId, accountId: crmAccountId, limit = 100 } = params;
  const result: CrmImportResult = { created: 0, updated: 0, errors: [] };

  let contacts: Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; title: string | null; phone: string | null; companyId?: string | null; companyName?: string | null; segmentName?: string | null }>;
  let resolveCompanyId: (crmCompanyId: string) => Promise<string | null>;
  let defaultCompanyId: string | null = existingCompanyId ?? null;

  if (crmSource === 'hubspot') {
    const { contacts: list, companies } = await hubspotFetchContacts({ companyId: crmAccountId ?? undefined, limit });
    contacts = list;
    if (!defaultCompanyId && crmAccountId && list.length > 0) {
      const acc = companies.get(crmAccountId);
      const name = acc?.name ?? list[0].companyName ?? crmAccountId;
      defaultCompanyId = await getOrCreateCompanyFromCrmAccount(prisma, userId, 'hubspot', crmAccountId, name, acc?.domain ?? null, acc?.website ?? null);
    }
    resolveCompanyId = async (hubspotCompanyId: string) => {
      const existing = await prisma.company.findFirst({
        where: { userId, hubspotId: hubspotCompanyId, crmSource: 'hubspot' },
        select: { id: true },
      });
      return existing?.id ?? null;
    };
  } else {
    const { contacts: list, accounts } = await salesforceFetchContacts({ accountId: crmAccountId ?? undefined, limit });
    contacts = list;
    if (!defaultCompanyId && crmAccountId && list.length > 0) {
      const acc = accounts.get(crmAccountId);
      const name = acc?.name ?? list[0].companyName ?? crmAccountId;
      defaultCompanyId = await getOrCreateCompanyFromCrmAccount(prisma, userId, 'salesforce', crmAccountId, name, acc?.domain ?? null, acc?.website ?? null);
    }
    resolveCompanyId = async (sfAccountId: string) => {
      const existing = await prisma.company.findFirst({
        where: { userId, salesforceId: sfAccountId, crmSource: 'salesforce' },
        select: { id: true },
      });
      return existing?.id ?? null;
    };
  }

  for (const c of contacts) {
    try {
      let companyId = defaultCompanyId ?? null;
      if (!companyId && c.companyId) {
        companyId = await resolveCompanyId(c.companyId);
      }
      if (!companyId) {
        result.errors.push(`Contact ${c.id}: no company (provide companyId or accountId)`);
        continue;
      }

      const company = await prisma.company.findFirst({
        where: { id: companyId, userId },
        select: { id: true },
      });
      if (!company) {
        result.errors.push(`Contact ${c.id}: company ${companyId} not found`);
        continue;
      }

      const email = c.email?.trim() || null;
      const existingByCrm = await prisma.contact.findFirst({
        where: {
          companyId,
          ...(crmSource === 'salesforce' ? { salesforceId: c.id } : { hubspotId: c.id }),
        },
      });
      const existingByEmail = email
        ? await prisma.contact.findUnique({
            where: { email_companyId: { email, companyId } },
          })
        : null;
      const existing = existingByCrm ?? existingByEmail;

      let companyDepartmentId: string | null = null;
      if (crmSource === 'salesforce' && c.segmentName?.trim() && companyId) {
        const departments = await prisma.companyDepartment.findMany({
          where: { companyId },
          select: { id: true, type: true, customName: true },
        });
        const q = c.segmentName.trim().toLowerCase();
        const matched = departments.find((d) => {
          const name = (d.customName ?? d.type.replace(/_/g, ' ')).toLowerCase();
          return name.includes(q) || q.includes(name) || d.type.toLowerCase() === q.replace(/\s+/g, '_');
        });
        if (matched) companyDepartmentId = matched.id;
      }

      const data = {
        firstName: c.firstName?.trim() || null,
        lastName: c.lastName?.trim() || null,
        email,
        title: c.title?.trim() || null,
        phone: c.phone?.trim() || null,
        crmSource,
        ...(crmSource === 'salesforce' ? { salesforceId: c.id } : { hubspotId: c.id }),
        enrichmentStatus: 'pending' as const,
        ...(companyDepartmentId ? { companyDepartmentId } : {}),
      };

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            ...data,
            ...(crmSource === 'salesforce' && !existing.salesforceId ? { salesforceId: c.id } : {}),
            ...(crmSource === 'hubspot' && !existing.hubspotId ? { hubspotId: c.id } : {}),
          },
        });
        result.updated++;
      } else {
        await prisma.contact.create({
          data: {
            companyId,
            ...data,
          },
        });
        result.created++;
      }
    } catch (e) {
      result.errors.push(`Contact ${c.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

/**
 * Push segment/buying group data to Salesforce (Account + Contact custom fields).
 * No-op if not Salesforce or segment env vars not set.
 */
export async function crmPushSegments(
  prisma: PrismaClient,
  params: { userId: string; companyId: string }
): Promise<CrmPushResult> {
  const { userId, companyId } = params;
  const result: CrmPushResult = { pushed: 0, errors: [] };

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true, salesforceId: true, crmSource: true },
  });
  if (!company || company.crmSource !== 'salesforce' || !company.salesforceId) {
    result.errors.push('Company not found or not linked to Salesforce');
    return result;
  }

  const [departments, contacts] = await Promise.all([
    prisma.companyDepartment.findMany({
      where: { companyId },
      select: { id: true, type: true, customName: true },
    }),
    prisma.contact.findMany({
      where: { companyId, salesforceId: { not: null } },
      select: { salesforceId: true, companyDepartmentId: true },
    }),
  ]);

  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const accountSegmentValue = departments.length
    ? departments.map((d) => d.customName ?? d.type.replace(/_/g, ' ')).join('; ')
    : null;

  const contactUpdates = contacts
    .filter((c): c is typeof c & { salesforceId: string } => c.salesforceId != null)
    .map((c) => {
      const dept = c.companyDepartmentId ? departmentById.get(c.companyDepartmentId) : null;
      const segmentValue = dept ? (dept.customName ?? dept.type.replace(/_/g, ' ')) : null;
      return { salesforceId: c.salesforceId!, segmentValue };
    });

  const pushResult = await salesforcePushSegmentUpdates({
    salesforceAccountId: company.salesforceId,
    accountSegmentValue,
    contacts: contactUpdates,
  });
  result.pushed = pushResult.updated;
  result.errors.push(...pushResult.errors);
  return result;
}

/**
 * Push recent activities (and optionally contact state) to CRM.
 */
export async function crmPush(
  prisma: PrismaClient,
  params: {
    crmSource: CrmSource;
    companyId?: string;
    contactIds?: string[];
    scope?: 'activities' | 'all';
    since?: Date;
  }
): Promise<CrmPushResult> {
  const { crmSource, companyId, contactIds, scope = 'activities', since } = params;
  const result: CrmPushResult = { pushed: 0, errors: [] };

  const where: { companyId?: string; id?: { in: string[] }; [key: string]: unknown } = {};
  if (companyId) where.companyId = companyId;
  if (contactIds?.length) where.id = { in: contactIds };

  const contacts = await prisma.contact.findMany({
    where: {
      ...where,
      ...(crmSource === 'salesforce' ? { salesforceId: { not: null } } : { hubspotId: { not: null } }),
    },
    select: {
      id: true,
      salesforceId: true,
      hubspotId: true,
    },
  });

  const contactIdToCrmId = new Map<string, string>();
  for (const c of contacts) {
    const crmId = crmSource === 'salesforce' ? c.salesforceId : c.hubspotId;
    if (crmId) contactIdToCrmId.set(c.id, crmId);
  }

  const sinceDate = since ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  })();

  const activities = await prisma.activity.findMany({
    where: {
      contactId: { in: [...contactIdToCrmId.keys()] },
      type: { in: ['Email', 'Meeting'] },
      createdAt: { gte: sinceDate },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, contactId: true, type: true, subject: true, content: true, summary: true, createdAt: true },
  });

  const pushActivity = crmSource === 'salesforce' ? salesforcePushActivity : hubspotPushActivity;

  for (const a of activities) {
    const contactId = a.contactId;
    if (!contactId) continue;
    const crmContactId = contactIdToCrmId.get(contactId);
    if (!crmContactId) continue;

    const type = a.type === 'Email' ? 'email' : 'meeting';
    const res = await pushActivity({
      contactId: crmContactId,
      type,
      subject: a.subject ?? undefined,
      body: a.content ?? undefined,
      summary: a.summary ?? undefined,
      createdAt: a.createdAt,
    });

    if (res.ok) {
      result.pushed++;
    } else {
      result.errors.push(`Activity ${a.id}: ${res.error}`);
    }
  }

  return result;
}
