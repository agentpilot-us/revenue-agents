import { tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';
import { discoverDepartments } from '@/app/actions/discover-departments';

/**
 * Chat tools for department discovery and lookup.
 * Each tool verifies the user owns the company before running.
 */
export const chatTools = {
  discover_departments: tool({
    description:
      'Discover departments at a company using AI research. Use when the user wants to find or add departments at an account.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID to research'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const departments = await discoverDepartments(companyId);
      return { departments };
    },
  }),

  list_departments: tool({
    description: 'List all departments at a company with contact/activity counts and products.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const departments = await prisma.companyDepartment.findMany({
        where: { companyId },
        include: {
          _count: { select: { contacts: true, activities: true } },
          companyProducts: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { departments };
    },
  }),

  find_contacts_in_department: tool({
    description:
      'Find contacts in a specific department at a company. departmentType must be the exact enum value (e.g. MANUFACTURING_OPERATIONS for Manufacturing, AUTONOMOUS_VEHICLES for Autonomous Vehicles, IT_DATA_CENTER for IT). Use the type returned by list_departments.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID (use the current account ID from context)'),
      departmentType: z.nativeEnum(DepartmentType).describe('Department type enum, e.g. MANUFACTURING_OPERATIONS, SALES, AUTONOMOUS_VEHICLES'),
    }),
    execute: async ({ companyId, departmentType }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const department = await prisma.companyDepartment.findUnique({
        where: {
          companyId_type: { companyId, type: departmentType },
        },
        include: {
          contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              title: true,
              linkedinUrl: true,
            },
          },
        },
      });
      if (!department) {
        return { error: 'Department not found' };
      }
      return {
        department: department.type,
        customName: department.customName,
        contacts: department.contacts,
      };
    },
  }),

  list_products: tool({
    description: 'List all products in the catalog.',
    inputSchema: z.object({}),
    execute: async () => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const products = await prisma.catalogProduct.findMany({
        orderBy: { name: 'asc' },
      });
      return { products };
    },
  }),

  calculate_product_fit: tool({
    description:
      'Calculate which products are the best fit for a company using AI. Returns prioritized opportunities with fit scores and next steps.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID to analyze'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
      });
      if (!company) return { error: 'Company not found' };
      const { calculateProductFit } = await import('@/app/actions/calculate-product-fit');
      const opportunities = await calculateProductFit(companyId);
      return { opportunities };
    },
  }),

  get_product_penetration: tool({
    description:
      'Get product penetration summary for a company: which products they own, which are opportunities, ARR and top opportunities.',
    inputSchema: z.object({
      companyId: z.string().describe('The company ID'),
    }),
    execute: async ({ companyId }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        include: {
          departments: {
            include: {
              companyProducts: {
                include: { product: true },
              },
            },
          },
        },
      });
      if (!company) return { error: 'Company not found' };
      const activeProducts = company.departments.flatMap((d) =>
        d.companyProducts.filter((cp) => cp.status === 'ACTIVE')
      );
      const opportunities = company.departments.flatMap((d) =>
        d.companyProducts.filter((cp) => cp.status === 'OPPORTUNITY')
      );
      const totalARR = activeProducts.reduce((sum, cp) => sum + Number(cp.arr ?? 0), 0);
      const totalOpportunity = opportunities.reduce(
        (sum, cp) => sum + Number(cp.opportunitySize ?? 0),
        0
      );
      const topOpportunities = opportunities
        .sort((a, b) => Number(b.fitScore ?? 0) - Number(a.fitScore ?? 0))
        .slice(0, 5)
        .map((opp) => {
          const dept = company.departments.find((d) => d.id === opp.companyDepartmentId);
          return {
            product: opp.product.name,
            department: dept?.type ?? opp.companyDepartmentId,
            fitScore: opp.fitScore != null ? Number(opp.fitScore) : null,
            estimatedARR: opp.opportunitySize != null ? Number(opp.opportunitySize) : null,
            reasoning: opp.fitReasoning,
          };
        });
      return {
        company: company.name,
        departments: company.departments.length,
        activeProducts: activeProducts.length,
        totalARR,
        opportunities: opportunities.length,
        totalOpportunity,
        topOpportunities,
      };
    },
  }),

  get_product_details: tool({
    description: 'Get detailed information about a specific product by id or slug.',
    inputSchema: z.object({
      productId: z.string().optional().describe('Product ID'),
      productSlug: z.string().optional().describe('Product slug, e.g. drive-platform'),
    }),
    execute: async ({ productId, productSlug }) => {
      const session = await auth();
      if (!session?.user?.id) return { error: 'Unauthorized' };
      if (!productId && !productSlug) return { error: 'Provide productId or productSlug' };
      const product = await prisma.catalogProduct.findFirst({
        where: productId ? { id: productId } : { slug: productSlug! },
        include: {
          companyProducts: {
            where: { status: 'ACTIVE' },
            include: {
              company: { select: { name: true } },
              companyDepartment: { select: { type: true } },
            },
          },
        },
      });
      if (!product) return { error: 'Product not found' };
      return {
        product: {
          name: product.name,
          description: product.description,
          priceRange: `$${Number(product.priceMin ?? 0).toLocaleString()} - $${Number(product.priceMax ?? 0).toLocaleString()}`,
          targetDepartments: product.targetDepartments,
          targetPersonas: product.targetPersonas,
          useCases: product.useCases,
          currentCustomers: product.companyProducts.length,
          exampleCustomers: product.companyProducts.slice(0, 5).map((cp) => ({
            company: cp.company.name,
            department: cp.companyDepartment?.type,
            arr: cp.arr != null ? Number(cp.arr) : null,
          })),
        },
      };
    },
  }),
};
