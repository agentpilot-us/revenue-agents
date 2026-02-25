import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { DepartmentType, DepartmentStatus, Prisma } from '@prisma/client';
import { companyResearchSchema } from '@/lib/research/company-research-schema';
import { save4StepResearch, DEPARTMENT_TYPES_ORDER } from '@/lib/research/save-4-step-research';
import { autoGenerateAccountMessaging } from '@/lib/account-messaging/auto-generate';
import { isDemoAccount } from '@/lib/demo/is-demo-account';

/** Legacy research payload (companyBasics, whatTheyDo, microSegments with roles + products as slug[]) */
const legacyResearchSchema = z.object({
  companyBasics: z.object({
    name: z.string(),
    website: z.string().optional(),
    industry: z.string().optional(),
    employees: z.string().optional(),
    headquarters: z.string().optional(),
    revenue: z.string().optional(),
  }),
  whatTheyDo: z.object({
    summary: z.string(),
    keyInitiatives: z.array(z.string()),
  }),
  microSegments: z.array(
    z.object({
      name: z.string(),
      departmentType: z.nativeEnum(DepartmentType).optional(),
      useCase: z.string().optional(),
      products: z.array(z.string()),
      estimatedOpportunity: z.string().optional(),
      roles: z.object({
        economicBuyer: z.array(z.string()).default([]),
        technicalEvaluator: z.array(z.string()).default([]),
        champion: z.array(z.string()).default([]),
        influencer: z.array(z.string()).default([]),
      }),
    })
  ),
});

function isNewSchema(body: unknown): body is { companyName: string } {
  return typeof body === 'object' && body !== null && 'companyName' in body && typeof (body as { companyName: unknown }).companyName === 'string';
}

function is4StepSchema(body: unknown): body is { companyBasics: unknown; enrichedGroups: unknown[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'enrichedGroups' in body &&
    Array.isArray((body as { enrichedGroups: unknown }).enrichedGroups) &&
    'companyBasics' in body &&
    typeof (body as { companyBasics: unknown }).companyBasics === 'object'
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      include: {
        departments: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (await isDemoAccount(companyId)) {
      return NextResponse.json(
        { error: 'Demo account is locked.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const catalogProducts = await prisma.catalogProduct.findMany({
      where: { userId: session.user.id },
      select: { id: true, slug: true, name: true },
    });
    const productNameToId = new Map(
      catalogProducts.map((p) => [p.name.trim().toLowerCase(), p.id])
    );
    const productSlugToId = new Map(catalogProducts.map((p) => [p.slug, p.id]));
    const summary = {
      departmentsCreated: 0,
      departmentsUpdated: 0,
      productsLinked: 0,
    };

    const researchGoal =
      typeof body.researchGoal === 'string' ? body.researchGoal.trim() || null : null;

    if (is4StepSchema(body)) {
      const companyBasics = body.companyBasics as {
        name: string;
        website?: string;
        industry?: string;
        employees?: string;
        headquarters?: string;
        revenue?: string;
      };
      const enrichedGroups = body.enrichedGroups as Array<{
        name: string;
        segmentType?: string;
        orgDepartment?: string;
        valueProp?: string;
        useCasesAtThisCompany?: string[];
        whyThisGroupBuys?: string;
        objectionHandlers?: Array<{ objection: string; response: string }>;
        roles?: { economicBuyer: string[]; technicalEvaluator: string[]; champion: string[]; influencer: string[] };
        searchKeywords?: string[];
        seniorityByRole?: Record<string, string[]>;
        products?: Array<{ productName?: string; productSlug?: string }>;
        estimatedOpportunity?: string;
      }>;

      const saveResult = await save4StepResearch({
        companyId,
        userId: session.user.id,
        company: {
          id: company.id,
          name: company.name,
          website: company.website,
          industry: company.industry,
          employees: company.employees,
          headquarters: company.headquarters,
          revenue: company.revenue,
        },
        companyBasics,
        enrichedGroups,
        researchGoal,
        researchDataPayload: body as Prisma.InputJsonValue,
      });
      summary.departmentsCreated = saveResult.departmentsCreated;
      summary.departmentsUpdated = saveResult.departmentsUpdated;
      summary.productsLinked = saveResult.productsLinked;
    } else if (isNewSchema(body)) {
      const researchData = companyResearchSchema.parse(body);

      // Write employees, headquarters, revenue as top-level Company fields (not only researchData)
      await prisma.company.update({
        where: { id: companyId },
        data: {
          name: researchData.companyName,
          website: researchData.website ?? company.website,
          industry: researchData.industry ?? company.industry,
          employees: researchData.employees ?? company.employees,
          headquarters: researchData.headquarters ?? company.headquarters,
          revenue: researchData.revenue ?? company.revenue,
          businessOverview: researchData.businessOverview,
          keyInitiatives: researchData.keyInitiatives,
          segmentationStrategy: researchData.segmentationStrategy ?? undefined,
          segmentationRationale: researchData.segmentationRationale ?? undefined,
          researchGoal: researchGoal ?? undefined,
          researchData: body,
        },
      });

      for (const segment of researchData.microSegments) {
        const departmentType = (segment.departmentType as DepartmentType) ?? DepartmentType.OTHER;
        const customName = segment.departmentType ? (segment.customName ?? null) : (segment.customName ?? segment.name);

        const existingDept = await prisma.companyDepartment.findUnique({
          where: {
            companyId_type: { companyId, type: departmentType },
          },
        });

        const useCaseText =
          segment.useCasesAtThisCompany?.length > 0
            ? segment.useCasesAtThisCompany.join('\n\n')
            : segment.useCase ?? null;
        const estimatedOpp =
          segment.estimatedOpportunity ?? null;

        const deptData = {
          companyId,
          type: departmentType,
          customName,
          status: DepartmentStatus.RESEARCH_PHASE as DepartmentStatus,
          useCase: useCaseText,
          targetRoles: segment.targetRoles,
          estimatedOpportunity: estimatedOpp,
          valueProp: segment.valueProp ?? undefined,
          proofPoints: segment.proofPoints ?? undefined,
          objectionHandlers: segment.objectionHandlers ?? undefined,
          notes: `AI-generated: ${segment.name}. ${segment.whyThisGroupMatters ?? ''}`.trim(),
        };

        let dept;
        if (existingDept) {
          dept = await prisma.companyDepartment.update({
            where: { id: existingDept.id },
            data: deptData,
          });
          summary.departmentsUpdated++;
        } else {
          dept = await prisma.companyDepartment.create({ data: deptData });
          summary.departmentsCreated++;
        }

        for (const pf of segment.products) {
          const productId =
            productNameToId.get((pf.productName ?? pf.productSlug ?? '').trim().toLowerCase()) ??
            productSlugToId.get(pf.productSlug ?? '');
          if (productId) {
            await prisma.companyProduct.upsert({
              where: {
                companyId_companyDepartmentId_productId: {
                  companyId,
                  companyDepartmentId: dept.id,
                  productId,
                },
              },
              create: {
                companyId,
                companyDepartmentId: dept.id,
                productId,
                status: 'OPPORTUNITY',
              },
              update: {},
            });
            summary.productsLinked++;
          }
        }
      }
    } else {
      const researchData = legacyResearchSchema.parse(body);

      // Write employees, headquarters, revenue as top-level Company fields (not only researchData)
      await prisma.company.update({
        where: { id: companyId },
        data: {
          name: researchData.companyBasics.name,
          website: researchData.companyBasics.website ?? company.website,
          industry: researchData.companyBasics.industry ?? company.industry,
          employees: researchData.companyBasics.employees ?? company.employees,
          headquarters: researchData.companyBasics.headquarters ?? company.headquarters,
          revenue: researchData.companyBasics.revenue ?? company.revenue,
          businessOverview: researchData.whatTheyDo.summary,
          keyInitiatives: researchData.whatTheyDo.keyInitiatives,
          researchGoal: researchGoal ?? undefined,
          researchData: body,
        },
      });

      for (const segment of researchData.microSegments) {
        const departmentType = segment.departmentType ?? DepartmentType.OTHER;
        const customName = segment.departmentType ? null : segment.name;

        const existingDept = await prisma.companyDepartment.findUnique({
          where: {
            companyId_type: { companyId, type: departmentType },
          },
        });

        const deptData = {
          companyId,
          type: departmentType,
          customName,
          status: DepartmentStatus.RESEARCH_PHASE as DepartmentStatus,
          useCase: segment.useCase ?? null,
          targetRoles: segment.roles,
          estimatedOpportunity: segment.estimatedOpportunity ?? null,
          notes: `AI-generated from research: ${segment.name}`,
        };

        let dept;
        if (existingDept) {
          dept = await prisma.companyDepartment.update({
            where: { id: existingDept.id },
            data: deptData,
          });
          summary.departmentsUpdated++;
        } else {
          dept = await prisma.companyDepartment.create({ data: deptData });
          summary.departmentsCreated++;
        }

        for (const productSlug of segment.products) {
          const productId = productSlugToId.get(productSlug);
          if (productId) {
            await prisma.companyProduct.upsert({
              where: {
                companyId_companyDepartmentId_productId: {
                  companyId,
                  companyDepartmentId: dept.id,
                  productId,
                },
              },
              create: {
                companyId,
                companyDepartmentId: dept.id,
                productId,
                status: 'OPPORTUNITY',
              },
              update: {},
            });
            summary.productsLinked++;
          }
        }
      }
    }

    let messagingGenerated = false;
    try {
      const messagingData = await autoGenerateAccountMessaging(companyId, session.user.id);
      if (messagingData) {
        await prisma.accountMessaging.upsert({
          where: { companyId },
          create: {
            companyId,
            userId: session.user.id,
            whyThisCompany: messagingData.whyThisCompany,
            useCases: messagingData.useCases,
            successStories: messagingData.successStories,
            objectionHandlers: messagingData.objectionHandlers,
            doNotMention: messagingData.doNotMention,
            aiGenerated: true,
          },
          update: {
            whyThisCompany: messagingData.whyThisCompany,
            useCases: messagingData.useCases,
            successStories: messagingData.successStories,
            objectionHandlers: messagingData.objectionHandlers,
            doNotMention: messagingData.doNotMention,
            aiGenerated: true,
          },
        });
        messagingGenerated = true;
      }
    } catch (error) {
      console.error('Auto-generate Account Messaging failed:', error);
    }

    await prisma.activity.create({
      data: {
        companyId,
        userId: session.user.id,
        type: 'Research',
        summary:
          summary.departmentsCreated + summary.departmentsUpdated > 0
            ? `Account research completed. ${summary.departmentsCreated + summary.departmentsUpdated} buying group(s) identified.`
            : 'Account research completed.',
      },
    });

    return NextResponse.json({
      success: true,
      summary,
      messagingGenerated,
    });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/apply-research error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid research data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Apply research failed' },
      { status: 500 }
    );
  }
}
