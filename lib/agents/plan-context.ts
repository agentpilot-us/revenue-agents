/**
 * Full plan context loader — assembles everything the plan execution
 * workflow needs in a single call.
 *
 * Used by the execute_expansion_plan tool before running the
 * deterministic workflow steps.
 */

import { prisma } from '@/lib/db';
import { buildExistingStackBlock, resolveProductFraming } from '@/lib/products/resolve-product-framing';
import { getActiveObjectionsBlock } from '@/lib/account-messaging';
import {
  getProductKnowledgeBlock,
  getCompanyEventsBlock,
  getCaseStudiesBlock,
  getActiveObjectionTexts,
  getExistingProductNames,
} from '@/lib/prompt-context';

export type PlanContext = {
  company: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    dealObjective: string | null;
  };
  product: {
    id: string;
    name: string;
    description: string | null;
    oneLiner: string | null;
    elevatorPitch: string | null;
    valueProps: string[] | null;
    painPoints: string[] | null;
    objectionHandlers: { objection: string; response: string }[] | null;
    competitivePositioning: string | null;
  } | null;
  productFraming: {
    framing: 'expansion' | 'upgrade' | 'prerequisite_met' | 'net_new';
    context: string;
  } | null;
  /** Target department/segment */
  segment: {
    id: string;
    name: string;
    valueProp: string | null;
    contactCount: number;
  } | null;
  /** Contacts in the target segment (with email) */
  contacts: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    title: string | null;
  }[];
  /** Primary contact for email (first with email) */
  primaryContact: {
    id: string;
    name: string | null;
    email: string;
    title: string | null;
  } | null;
  /** Prompt blocks (pre-built for injection into AI prompts) */
  promptBlocks: {
    existingStack: string | null;
    activeObjections: string | null;
    productKnowledge: string | null;
    events: string | null;
    caseStudies: string | null;
  };
  userId: string;
};

export type LoadPlanContextParams = {
  companyId: string;
  userId: string;
  productName?: string;
  segmentName?: string;
};

export async function loadFullPlanContext(
  params: LoadPlanContextParams
): Promise<PlanContext> {
  const { companyId, userId, productName, segmentName } = params;

  // Core company data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      domain: true,
      industry: true,
      dealObjective: true,
    },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  // Resolve product (by name match against user's catalog)
  let product: PlanContext['product'] = null;
  let productFraming: PlanContext['productFraming'] = null;

  if (productName) {
    const catalogProduct = await prisma.catalogProduct.findFirst({
      where: {
        userId,
        name: { contains: productName, mode: 'insensitive' },
      },
      select: { id: true, name: true, description: true },
    });

    if (catalogProduct) {
      const profile = await prisma.productProfile.findFirst({
        where: { catalogProductId: catalogProduct.id, userId },
        select: {
          oneLiner: true,
          elevatorPitch: true,
          valueProps: true,
          painPoints: true,
          objectionHandlers: true,
          competitivePositioning: true,
        },
      });

      product = {
        id: catalogProduct.id,
        name: catalogProduct.name,
        description: catalogProduct.description,
        oneLiner: profile?.oneLiner ?? null,
        elevatorPitch: profile?.elevatorPitch ?? null,
        valueProps: (profile?.valueProps ?? null) as string[] | null,
        painPoints: (profile?.painPoints ?? null) as string[] | null,
        objectionHandlers: (profile?.objectionHandlers ?? null) as { objection: string; response: string }[] | null,
        competitivePositioning: (profile?.competitivePositioning as string) ?? null,
      };

      productFraming = await resolveProductFraming(companyId, catalogProduct.id);
    }
  }

  // Resolve target segment
  let segment: PlanContext['segment'] = null;
  let contacts: PlanContext['contacts'] = [];
  let primaryContact: PlanContext['primaryContact'] = null;

  if (segmentName) {
    // Search by customName first
    let dept = await prisma.companyDepartment.findFirst({
      where: {
        companyId,
        customName: { contains: segmentName, mode: 'insensitive' },
      },
    });

    // Fallback: search all departments for fuzzy match on type
    if (!dept) {
      const allDepts = await prisma.companyDepartment.findMany({
        where: { companyId },
      });
      const q = segmentName.trim().toLowerCase();
      dept = allDepts.find((d) => {
        const name = (d.customName ?? d.type.replace(/_/g, ' ')).toLowerCase();
        return name.includes(q) || q.includes(name);
      }) ?? null;
    }

    if (dept) {
      const deptContacts = await prisma.contact.findMany({
        where: { companyDepartmentId: dept.id },
        select: { id: true, firstName: true, lastName: true, email: true, title: true },
      });

      segment = {
        id: dept.id,
        name: dept.customName ?? dept.type.replace(/_/g, ' '),
        valueProp: dept.valueProp,
        contactCount: deptContacts.length,
      };
      contacts = deptContacts;
      const firstWithEmail = deptContacts.find((c) => c.email != null);
      primaryContact = firstWithEmail
        ? {
            id: firstWithEmail.id,
            name: [firstWithEmail.firstName, firstWithEmail.lastName].filter(Boolean).join(' ') || null,
            email: firstWithEmail.email!,
            title: firstWithEmail.title,
          }
        : null;
    }
  }

  // If no segment specified, get all contacts with email for the company
  if (!segment) {
    const allContacts = await prisma.contact.findMany({
      where: { companyId, email: { not: null } },
      select: { id: true, firstName: true, lastName: true, email: true, title: true },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });
    contacts = allContacts;
    const first = allContacts[0];
    primaryContact = first
      ? {
          id: first.id,
          name: [first.firstName, first.lastName].filter(Boolean).join(' ') || null,
          email: first.email!,
          title: first.title,
        }
      : null;
  }

  // Build prompt blocks in parallel
  const objectionTexts = await getActiveObjectionTexts(companyId, userId);
  const productNames = await getExistingProductNames(companyId, userId);

  const [existingStack, activeObjections, productKnowledge, events, caseStudies] =
    await Promise.all([
      buildExistingStackBlock(companyId, userId),
      segment
        ? getActiveObjectionsBlock(companyId, userId, segment.id)
        : getActiveObjectionsBlock(companyId, userId),
      getProductKnowledgeBlock(userId),
      getCompanyEventsBlock(userId, undefined, undefined, undefined, {
        activeObjections: objectionTexts,
        existingProducts: productNames,
      }),
      getCaseStudiesBlock(userId),
    ]);

  return {
    company,
    product,
    productFraming,
    segment,
    contacts,
    primaryContact,
    promptBlocks: {
      existingStack,
      activeObjections,
      productKnowledge,
      events,
      caseStudies,
    },
    userId,
  };
}
