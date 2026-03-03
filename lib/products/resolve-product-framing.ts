import { prisma } from '@/lib/db';

export type ProductFraming = {
  framing: 'expansion' | 'upgrade' | 'prerequisite_met' | 'net_new';
  context: string;
};

type ProductRelationship = {
  productId: string;
  productName: string;
  relationship: 'upgrade_path' | 'complementary' | 'prerequisite' | 'replacement';
};

/**
 * Determine how to frame content for a specific product at a specific account.
 *
 * 1. Is this product already ACTIVE at the account? -> expansion framing
 * 2. Does this product have an upgrade_path from something ACTIVE? -> upgrade framing
 * 3. Does this product have a prerequisite that's ACTIVE? -> prerequisite_met framing
 * 4. None of the above -> net_new framing
 */
export async function resolveProductFraming(
  companyId: string,
  productId: string
): Promise<ProductFraming> {
  // Get existing products at this account (ACTIVE/TRIAL, company-level)
  const existingProducts = await prisma.companyProduct.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
    select: { productId: true, product: { select: { name: true } } },
  });

  const activeProductIds = new Set(existingProducts.map((ep) => ep.productId));

  // Check 1: Is this product already active?
  if (activeProductIds.has(productId)) {
    const name = existingProducts.find((ep) => ep.productId === productId)?.product.name ?? 'this product';
    return {
      framing: 'expansion',
      context: `${name} is already deployed at this account. Frame outreach as deepening usage or expanding to additional teams/use cases.`,
    };
  }

  // Get the target product's relationships from the catalog
  const targetProduct = await prisma.catalogProduct.findUnique({
    where: { id: productId },
    select: { name: true, relatedProducts: true },
  });

  if (!targetProduct) {
    return { framing: 'net_new', context: 'New product opportunity. Frame as a net-new introduction.' };
  }

  const relationships = (Array.isArray(targetProduct.relatedProducts)
    ? targetProduct.relatedProducts
    : []) as ProductRelationship[];

  // Check 2: Does this product have an upgrade_path from something ACTIVE?
  for (const rel of relationships) {
    if (rel.relationship === 'upgrade_path' && activeProductIds.has(rel.productId)) {
      return {
        framing: 'upgrade',
        context: `${targetProduct.name} is a natural upgrade from ${rel.productName}, which this account already uses. Frame outreach as building on their existing ${rel.productName} investment.`,
      };
    }
  }

  // Check 3: Does this product have a prerequisite that's ACTIVE?
  for (const rel of relationships) {
    if (rel.relationship === 'prerequisite' && activeProductIds.has(rel.productId)) {
      return {
        framing: 'prerequisite_met',
        context: `This account already has ${rel.productName}, which is a prerequisite for ${targetProduct.name}. They are ready to activate ${targetProduct.name} — frame outreach around unlocking additional capabilities.`,
      };
    }
  }

  // Check complementary relationships (mild preference, but still net-new positioning)
  for (const rel of relationships) {
    if (rel.relationship === 'complementary' && activeProductIds.has(rel.productId)) {
      return {
        framing: 'net_new',
        context: `This account uses ${rel.productName}, which is complementary to ${targetProduct.name}. Reference their existing ${rel.productName} usage to establish credibility, but position ${targetProduct.name} as a new addition to their stack.`,
      };
    }
  }

  return {
    framing: 'net_new',
    context: `New product opportunity. Frame as a net-new introduction to ${targetProduct.name}.`,
  };
}

/**
 * Build a text block describing the account's existing stack and product relationships.
 * Used by research pipeline and content generation prompts.
 */
export async function buildExistingStackBlock(
  companyId: string,
  userId: string
): Promise<string | null> {
  const existingProducts = await prisma.companyProduct.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
    include: {
      product: {
        select: { id: true, name: true, relatedProducts: true },
      },
    },
  });

  if (existingProducts.length === 0) return null;

  const lines: string[] = [
    'EXISTING STACK (products this account already owns):',
  ];

  for (const ep of existingProducts) {
    let detail = `- ${ep.product.name} -- ${ep.status}`;
    if (ep.deployedSince) {
      detail += ` since ${new Date(ep.deployedSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    if (ep.contractRenewalDate) {
      detail += `, renewal ${new Date(ep.contractRenewalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    lines.push(detail);
  }

  // Build relationship block from catalog products
  const allCatalogProducts = await prisma.catalogProduct.findMany({
    where: { userId },
    select: { id: true, name: true, relatedProducts: true },
  });

  const activeIds = new Set(existingProducts.map((ep) => ep.product.id));
  const relationshipLines: string[] = [];

  for (const cp of allCatalogProducts) {
    const rels = (Array.isArray(cp.relatedProducts) ? cp.relatedProducts : []) as ProductRelationship[];
    for (const rel of rels) {
      if (activeIds.has(rel.productId)) {
        const relLabel = rel.relationship.replace(/_/g, ' ').toUpperCase();
        relationshipLines.push(`- ${cp.name} is ${relLabel} from ${rel.productName}`);
      }
    }
  }

  if (relationshipLines.length > 0) {
    lines.push('');
    lines.push('PRODUCT RELATIONSHIPS (from seller catalog):');
    lines.push(...relationshipLines);
  }

  lines.push('');
  lines.push('SCORING RULES:');
  lines.push('- Products with upgrade_path from an ACTIVE product: score higher, talkingPoint = expansion');
  lines.push('- Products with prerequisite already ACTIVE: score higher, talkingPoint = ready to activate');
  lines.push('- Products complementary to ACTIVE products: score based on division fit');
  lines.push('- Products with no relationship to anything ACTIVE: score as net-new');

  return lines.join('\n');
}
