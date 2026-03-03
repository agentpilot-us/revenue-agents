import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ProductOwnershipStatus } from '@prisma/client';
import { z } from 'zod';

const existingProductSchema = z.object({
  productId: z.string().min(1),
  status: z.enum(['ACTIVE', 'TRIAL', 'CHURNED']),
  deployedSince: z.string().datetime().optional().nullable(),
  contractRenewalDate: z.string().datetime().optional().nullable(),
  usageNotes: z.string().optional().nullable(),
  companyDepartmentId: z.string().optional().nullable(),
});

const bodySchema = z.object({
  products: z.array(existingProductSchema),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const products = await prisma.companyProduct.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'TRIAL', 'CHURNED'] },
    },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      companyDepartment: {
        select: { id: true, customName: true, type: true },
      },
    },
    orderBy: [{ companyDepartmentId: 'asc' }, { updatedAt: 'desc' }],
  });

  return NextResponse.json({
    products: products.map((p) => {
      const dept = p.companyDepartment;
      return {
        ...p,
        department: dept
          ? { id: dept.id, customName: dept.customName, type: dept.type }
          : null,
      };
    }),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = await params;
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { products } = parsed.data;

  // Validate all product IDs belong to this user's catalog
  const productIds = products.map((p) => p.productId);
  if (productIds.length > 0) {
    const catalogProducts = await prisma.catalogProduct.findMany({
      where: { id: { in: productIds }, userId: session.user.id },
      select: { id: true },
    });
    const validIds = new Set(catalogProducts.map((cp) => cp.id));
    const invalid = productIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Products not in your catalog: ${invalid.join(', ')}` },
        { status: 400 }
      );
    }
  }

  const deptIds = products
    .map((p) => p.companyDepartmentId)
    .filter((id): id is string => !!id);
  if (deptIds.length > 0) {
    const validDepts = await prisma.companyDepartment.findMany({
      where: { id: { in: deptIds }, companyId },
      select: { id: true },
    });
    const validDeptSet = new Set(validDepts.map((d) => d.id));
    const invalidDept = deptIds.filter((id) => !validDeptSet.has(id));
    if (invalidDept.length > 0) {
      return NextResponse.json(
        { error: `Departments not found for this company: ${invalidDept.join(', ')}` },
        { status: 400 }
      );
    }
  }

  const incomingKeys = new Set(
    products.map((p) => `${p.productId}:${p.companyDepartmentId ?? 'null'}`)
  );

  const existing = await prisma.companyProduct.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'TRIAL', 'CHURNED'] },
    },
    select: { id: true, productId: true, companyDepartmentId: true },
  });

  const toDelete = existing.filter(
    (e) => !incomingKeys.has(`${e.productId}:${e.companyDepartmentId ?? 'null'}`)
  );
  if (toDelete.length > 0) {
    await prisma.companyProduct.deleteMany({
      where: { id: { in: toDelete.map((d) => d.id) } },
    });
  }

  const results = await Promise.all(
    products.map(async (p) => {
      const deptId = p.companyDepartmentId ?? null;
      const existingRow = await prisma.companyProduct.findFirst({
        where: {
          companyId,
          productId: p.productId,
          companyDepartmentId: deptId,
        },
      });

      const data = {
        status: p.status as ProductOwnershipStatus,
        deployedSince: p.deployedSince ? new Date(p.deployedSince) : null,
        contractRenewalDate: p.contractRenewalDate ? new Date(p.contractRenewalDate) : null,
        usageNotes: p.usageNotes ?? null,
        companyDepartmentId: deptId,
      };

      if (existingRow) {
        return prisma.companyProduct.update({
          where: { id: existingRow.id },
          data,
          include: {
            product: { select: { id: true, name: true, slug: true } },
            companyDepartment: { select: { id: true, customName: true, type: true } },
          },
        });
      }

      return prisma.companyProduct.create({
        data: {
          companyId,
          productId: p.productId,
          ...data,
        },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          companyDepartment: { select: { id: true, customName: true, type: true } },
        },
      });
    })
  );

  return NextResponse.json({
    products: results.map((p) => ({
      ...p,
      department: p.companyDepartment
        ? { id: p.companyDepartment.id, customName: p.companyDepartment.customName, type: p.companyDepartment.type }
        : null,
    })),
  });
}
