/**
 * Gather structured context for account strategy recommendation.
 * Used by the recommend_account_strategy chat tool so the AI can present
 * a consistent narrative: footprint → product fit → departments → signals → constraints → recommended plays.
 */

import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ProductRelationship = {
  productId: string;
  productName: string;
  relationship: 'upgrade_path' | 'complementary' | 'prerequisite' | 'replacement';
};

export type CurrentProductEntry = {
  productName: string;
  productSlug: string;
  departmentName?: string | null;
  status: string;
  arr?: number | null;
  contractEnd?: string | null;
  contractRenewalDate?: string | null;
};

export type TargetProductEntry = {
  name: string;
  slug: string;
  description: string | null;
  relationships: Array<{ productName: string; relationship: string }>;
  ownedByAccount: boolean;
  ownedProductName?: string | null;
};

export type BuyingGroupEntry = {
  departmentId: string;
  departmentName: string;
  contactCount: number;
  valueProp?: string | null;
  useCase?: string | null;
  opportunity?: string | null;
  productsInDept: Array<{ productName: string; status: string; arr?: number | null }>;
  lastContacted?: string | null;
  hasActivePlay: boolean;
};

export type ActivePlayRunEntry = {
  playRunId: string;
  playName: string;
};

export type RecentSignalEntry = {
  type: string;
  title: string;
  summary: string;
  publishedAt: string;
  suggestedPlay?: string | null;
};

export type StrategyContext = {
  companyId: string;
  companyName: string;
  currentProducts: CurrentProductEntry[];
  targetProduct?: TargetProductEntry | null;
  buyingGroups: BuyingGroupEntry[];
  coverageGaps: string[];
  activePlayRuns: ActivePlayRunEntry[];
  recentSignals: RecentSignalEntry[];
  decisions: string[];
  objections: Array<{ objection: string; response?: string }>;
  availablePlayTemplates: Array<{ id: string; name: string; slug: string; triggerType: string }>;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLastContacted(date: Date | null): string | null {
  if (!date) return null;
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return 'last week';
  if (days < 30) return `${days} days ago`;
  if (days < 90) return '30+ days ago';
  return '90+ days ago';
}

function parseDecisions(agentContext: unknown): string[] {
  if (!agentContext || typeof agentContext !== 'object') return [];
  const ctx = agentContext as { decisions?: string[] };
  return Array.isArray(ctx.decisions) ? ctx.decisions : [];
}

function parseActiveObjectionsForStrategy(raw: unknown): Array<{ objection: string; response?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { objection?: string; response?: string; status?: string } =>
        item != null && typeof item === 'object'
    )
    .filter((o) => o.status === 'active' || o.status === undefined)
    .map((o) => ({ objection: o.objection ?? '', response: o.response ?? undefined }));
}

// ─── Main ──────────────────────────────────────────────────────────────────

const SIGNAL_DAYS = 30;

export async function gatherStrategyContext(
  companyId: string,
  userId: string,
  options?: { productSlug?: string; focusDepartment?: string }
): Promise<StrategyContext> {
  const productSlug = options?.productSlug?.trim() || undefined;
  const focusDepartment = options?.focusDepartment?.trim() || undefined;
  const thirtyDaysAgo = subDays(new Date(), SIGNAL_DAYS);

  const [
    company,
    catalogProducts,
    activePlayRuns,
    recentSignals,
    playTemplates,
  ] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, userId },
      select: {
        id: true,
        name: true,
        agentContext: true,
        activeObjections: true,
        departments: {
          include: {
            companyProducts: {
              include: { product: { select: { id: true, name: true, slug: true } } },
            },
            contacts: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true,
                email: true,
                lastContactedAt: true,
              },
            },
          },
        },
        companyProducts: {
          where: { companyDepartmentId: null },
          include: { product: { select: { id: true, name: true, slug: true } } },
        },
      },
    }),
    prisma.catalogProduct.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true, description: true, relatedProducts: true },
    }),
    prisma.playRun.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: { playTemplate: { select: { name: true } } },
      orderBy: { activatedAt: 'desc' },
      take: 20,
    }),
    prisma.accountSignal.findMany({
      where: { companyId, publishedAt: { gte: thirtyDaysAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        type: true,
        title: true,
        summary: true,
        publishedAt: true,
        suggestedPlay: true,
      },
    }),
    prisma.playTemplate.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, triggerType: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!company) {
    throw new Error('Company not found');
  }

  const decisions = parseDecisions(company.agentContext);
  const objections = company.activeObjections
    ? parseActiveObjectionsForStrategy(company.activeObjections)
    : [];

  const deptLabel = (d: { type: string; customName: string | null }) =>
    d.customName || d.type.replace(/_/g, ' ');

  const currentProducts: CurrentProductEntry[] = [];

  for (const dept of company.departments) {
    for (const cp of dept.companyProducts) {
      currentProducts.push({
        productName: cp.product.name,
        productSlug: cp.product.slug,
        departmentName: deptLabel(dept),
        status: cp.status,
        arr: cp.arr != null ? Number(cp.arr) : null,
        contractEnd: cp.contractEnd?.toISOString().slice(0, 10) ?? null,
        contractRenewalDate: cp.contractRenewalDate?.toISOString().slice(0, 10) ?? null,
      });
    }
  }
  for (const cp of company.companyProducts) {
    currentProducts.push({
      productName: cp.product.name,
      productSlug: cp.product.slug,
      departmentName: null,
      status: cp.status,
      arr: cp.arr != null ? Number(cp.arr) : null,
      contractEnd: cp.contractEnd?.toISOString().slice(0, 10) ?? null,
      contractRenewalDate: cp.contractRenewalDate?.toISOString().slice(0, 10) ?? null,
    });
  }

  const ownedProductIds = new Set(
    currentProducts.map((p) => catalogProducts.find((c) => c.slug === p.productSlug)?.id).filter(Boolean)
  );

  let targetProduct: TargetProductEntry | null = null;
  if (productSlug) {
    const target = catalogProducts.find(
      (p) => p.slug === productSlug || p.slug.toLowerCase().replace(/\s+/g, '-') === productSlug.toLowerCase()
    );
    if (target) {
      const rels = (Array.isArray(target.relatedProducts) ? target.relatedProducts : []) as Array<{
        productId?: string;
        productName?: string;
        relationship?: string;
      }>;
      const relationships = rels.map((r) => ({
        productName: r.productName ?? 'Unknown',
        relationship: r.relationship ?? 'complementary',
      }));
      const ownedRel = rels.find((r) => r.productId && ownedProductIds.has(r.productId));
      const ownedProduct = ownedRel
        ? catalogProducts.find((c) => c.id === ownedRel.productId)
        : null;
      targetProduct = {
        name: target.name,
        slug: target.slug,
        description: target.description,
        relationships,
        ownedByAccount: ownedProductIds.has(target.id),
        ownedProductName: ownedProduct?.name ?? (ownedRel?.productName as string | undefined) ?? null,
      };
    }
  }

  const activeRunIds = new Set(activePlayRuns.map((r) => r.id));
  const buyingGroups: BuyingGroupEntry[] = [];
  const coverageGaps: string[] = [];

  for (const dept of company.departments) {
    if (focusDepartment && !deptLabel(dept).toLowerCase().includes(focusDepartment.toLowerCase())) {
      continue;
    }
    const contactCount = dept.contacts.length;
    const lastContacted = dept.contacts.reduce<Date | null>((acc, c) => {
      const t = c.lastContactedAt;
      if (!t) return acc;
      if (!acc) return t;
      return t > acc ? t : acc;
    }, null);
    const productsInDept = dept.companyProducts.map((cp) => ({
      productName: cp.product.name,
      status: cp.status,
      arr: cp.arr != null ? Number(cp.arr) : null,
    }));
    const hasActivePlay = false;
    buyingGroups.push({
      departmentId: dept.id,
      departmentName: deptLabel(dept),
      contactCount,
      valueProp: dept.valueProp ?? null,
      useCase: dept.useCase ?? null,
      opportunity: dept.estimatedOpportunity ?? null,
      productsInDept,
      lastContacted: formatLastContacted(lastContacted),
      hasActivePlay,
    });
    if (contactCount === 0) {
      coverageGaps.push(deptLabel(dept));
    }
  }

  return {
    companyId: company.id,
    companyName: company.name,
    currentProducts,
    targetProduct: targetProduct ?? undefined,
    buyingGroups,
    coverageGaps,
    activePlayRuns: activePlayRuns.map((r) => ({
      playRunId: r.id,
      playName: r.playTemplate.name,
    })),
    recentSignals: recentSignals.map((s) => ({
      type: s.type,
      title: s.title,
      summary: s.summary,
      publishedAt: s.publishedAt.toISOString(),
      suggestedPlay: s.suggestedPlay ?? null,
    })),
    decisions,
    objections,
    availablePlayTemplates: playTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      triggerType: t.triggerType,
    })),
  };
}
