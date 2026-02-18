import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { DepartmentType, DepartmentStatus } from '@prisma/client';
import { companyResearchSchema, microSegmentSchema } from '@/lib/research/company-research-schema';
import { autoGenerateAccountMessaging } from '@/lib/account-messaging/auto-generate';

const applyResearchSchema = companyResearchSchema.extend({
  microSegments: z.array(
    microSegmentSchema.extend({
      departmentType: z.nativeEnum(DepartmentType).optional(),
    })
  ),
});

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

    const body = await req.json();
    const researchData = applyResearchSchema.parse(body);

    // Get catalog products for mapping
    const catalogProducts = await prisma.catalogProduct.findMany({
      select: { id: true, slug: true, name: true },
    });
    const productSlugToId = new Map(catalogProducts.map((p) => [p.slug, p.id]));

    // Update company basics
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
        researchData: body, // Store raw research data
      },
    });

    const summary = {
      departmentsCreated: 0,
      departmentsUpdated: 0,
      productsLinked: 0,
    };

    // Create/update departments for each micro-segment
    for (const segment of researchData.microSegments) {
      const departmentType = segment.departmentType ?? DepartmentType.OTHER;
      const customName = segment.departmentType ? null : segment.name;

      // Check if department already exists (by unique constraint: companyId + type)
      const existingDept = await prisma.companyDepartment.findUnique({
        where: {
          companyId_type: {
            companyId,
            type: departmentType,
          },
        },
      });

      const deptData = {
        companyId,
        type: departmentType,
        customName,
        status: DepartmentStatus.RESEARCH_PHASE as DepartmentStatus,
        useCase: segment.useCase,
        targetRoles: segment.roles,
        estimatedOpportunity: segment.estimatedOpportunity,
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
        dept = await prisma.companyDepartment.create({
          data: deptData,
        });
        summary.departmentsCreated++;
      }

      // Link products to department
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

    // Auto-generate Account Messaging after research is applied
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
      // Don't fail the research apply if messaging generation fails
      console.error('Auto-generate Account Messaging failed:', error);
    }

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
