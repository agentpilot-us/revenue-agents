import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;
    const userId = session.user.id;

    const companyProduct = await prisma.companyProduct.findFirst({
      where: {
        id: productId,
        company: { userId },
      },
      select: {
        id: true,
        status: true,
        opportunitySize: true,
        companyId: true,
        company: { select: { name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    if (!companyProduct) {
      return NextResponse.json({ error: 'Product not found for this user' }, { status: 404 });
    }

    const title = `Activate product: ${companyProduct.product.name}`;
    const summary = `Track ${companyProduct.product.name} for account ${
      companyProduct.company.name
    } as a first-class trigger. Status: ${
      companyProduct.status
    }. Potential: ${companyProduct.opportunitySize ?? 'n/a'}.`;

    const signal = await prisma.accountSignal.create({
      data: {
        companyId: companyProduct.companyId,
        userId,
        type: 'internal_product_trigger',
        title,
        summary,
        url: '',
        publishedAt: new Date(),
        relevanceScore: 7,
        suggestedPlay: 'new_buying_group',
      },
    });

    // Auto-create workflows for matching accounts using playbook targeting
    const workflowIds = await autoCreateProductWorkflows(userId, companyProduct.product.name);

    return NextResponse.json({ ok: true, signalId: signal.id, workflowsCreated: workflowIds.length });
  } catch (error) {
    console.error('POST /api/my-company/products/[productId]/activate error:', error);
    return NextResponse.json({ error: 'Failed to activate product trigger' }, { status: 500 });
  }
}

async function autoCreateProductWorkflows(userId: string, productName: string): Promise<string[]> {
  const template = await prisma.playbookTemplate.findFirst({
    where: {
      userId,
      OR: [
        { triggerType: 'feature_release' },
        { name: { contains: 'Product Announcement', mode: 'insensitive' } },
        { name: { contains: 'Feature', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      targetDepartmentTypes: true,
      targetIndustries: true,
    },
    orderBy: { priority: 'desc' },
  });
  if (!template) return [];

  const targetDepts = (template.targetDepartmentTypes as string[]) ?? [];
  const targetIndustries = (template.targetIndustries as string[]) ?? [];

  // Find matching accounts
  const companies = await prisma.company.findMany({
    where: {
      userId,
      ...(targetIndustries.length > 0 && { industry: { in: targetIndustries, mode: 'insensitive' } }),
    },
    select: {
      id: true,
      name: true,
      departments: { select: { id: true, type: true } },
    },
  });

  const workflowIds: string[] = [];

  for (const company of companies) {
    const hasDeptMatch = targetDepts.length === 0 ||
      company.departments.some((d) => d.type && targetDepts.includes(d.type));

    if (!hasDeptMatch) continue;

    // Check if there's a PlaybookActivation for this account, or proceed anyway for product launches
    try {
      const workflow = await assembleWorkflow({
        userId,
        companyId: company.id,
        templateId: template.id,
        title: `${productName} Launch — ${company.name}`,
        description: `Product announcement workflow for ${company.name}`,
      });
      workflowIds.push(workflow.id);
    } catch {
      console.warn(`Skipped workflow for ${company.name}: assembly failed`);
    }
  }

  return workflowIds;
}
