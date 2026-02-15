import { prisma } from '@/lib/db';
import { ContentType, Prisma } from '@prisma/client';

type UseCaseEntry = {
  contentLibraryId: string;
  customNote?: string;
  departmentFit?: string[];
};

type SuccessStoryEntry = {
  contentLibraryId: string;
  whyRelevant: string;
  bestForDepartments?: string[];
};

type AccountMessagingData = {
  whyThisCompany: string[];
  useCases: UseCaseEntry[];
  successStories: SuccessStoryEntry[];
  objectionHandlers: Array<{ objection: string; response: string }>;
  doNotMention: Array<{ topic: string; reason: string }>;
};

/**
 * Auto-generate Account Messaging from Research data and Content Library.
 * Prioritizes company-branded Content Library entries (includes ALL).
 */
export async function autoGenerateAccountMessaging(
  companyId: string,
  userId: string
): Promise<AccountMessagingData | null> {
  try {
    // Fetch company with research data
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId },
      select: {
        id: true,
        name: true,
        industry: true,
        businessOverview: true,
        keyInitiatives: true,
        departments: {
          where: {
            OR: [
              { useCase: { not: null } },
              { targetRoles: { not: Prisma.JsonNull } },
            ],
          },
          select: {
            type: true,
            customName: true,
            useCase: true,
          },
        },
      },
    });

    if (!company) {
      return null;
    }

    // Get user's company name for Content Library matching
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyName: true },
    });
    const userCompanyName = user?.companyName || 'Your company';

    // Get department names from research
    const researchDepartments = company.departments.map((dept) =>
      dept.customName || dept.type.replace(/_/g, ' ')
    );

    // Query Content Library with priority:
    // 1. Company-branded (user's company name) - include ALL
    // 2. Industry-matched
    // 3. Department-matched
    const companyBranded = await prisma.contentLibrary.findMany({
      where: {
        userId,
        company: userCompanyName,
        type: { in: [ContentType.UseCase, ContentType.SuccessStory] },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        type: true,
        department: true,
        industry: true,
      },
      orderBy: { title: 'asc' },
    });

    const industryMatched = await prisma.contentLibrary.findMany({
      where: {
        userId,
        company: { not: userCompanyName },
        type: { in: [ContentType.UseCase, ContentType.SuccessStory] },
        isActive: true,
        OR: [
          { industry: company.industry },
          { industry: null },
          { industry: '' },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        department: true,
        industry: true,
      },
      orderBy: { title: 'asc' },
    });

    const departmentMatched = await prisma.contentLibrary.findMany({
      where: {
        userId,
        company: { not: userCompanyName },
        type: { in: [ContentType.UseCase, ContentType.SuccessStory] },
        isActive: true,
        department: { in: researchDepartments },
      },
      select: {
        id: true,
        title: true,
        type: true,
        department: true,
        industry: true,
      },
      orderBy: { title: 'asc' },
    });

    // Combine and deduplicate (company-branded first, then industry, then department)
    const allContent = [
      ...companyBranded,
      ...industryMatched.filter((c) => !companyBranded.some((cb) => cb.id === c.id)),
      ...departmentMatched.filter(
        (c) =>
          !companyBranded.some((cb) => cb.id === c.id) &&
          !industryMatched.some((im) => im.id === c.id)
      ),
    ];

    // Separate use cases and success stories
    const useCases = allContent.filter((c) => c.type === ContentType.UseCase);
    const successStories = allContent.filter((c) => c.type === ContentType.SuccessStory);

    // Generate whyThisCompany from research data
    const whyThisCompany: string[] = [];
    if (company.businessOverview) {
      whyThisCompany.push(company.businessOverview);
    }
    if (company.keyInitiatives) {
      const initiatives = company.keyInitiatives as string[] | null;
      if (Array.isArray(initiatives) && initiatives.length > 0) {
        initiatives.slice(0, 3).forEach((initiative) => {
          whyThisCompany.push(`Strategic focus: ${initiative}`);
        });
      }
    }

    // Map use cases with department fit
    const useCaseEntries: UseCaseEntry[] = useCases.map((uc) => ({
      contentLibraryId: uc.id,
      departmentFit: uc.department ? [uc.department] : undefined,
    }));

    // Map success stories with why relevant and best departments
    const successStoryEntries: SuccessStoryEntry[] = successStories.map((ss) => ({
      contentLibraryId: ss.id,
      whyRelevant: `Relevant ${ss.industry ? `to ${ss.industry} industry` : ''}${ss.department ? ` and ${ss.department} department` : ''}`,
      bestForDepartments: ss.department ? [ss.department] : undefined,
    }));

    // Generate generic objection handlers (can be customized later)
    const objectionHandlers = [
      {
        objection: 'We already have a solution',
        response: 'Many customers use our solution alongside existing tools to enhance capabilities and accelerate outcomes.',
      },
      {
        objection: 'We need to evaluate other options',
        response: 'We offer proof-of-concept programs and can connect you with similar customers for reference calls.',
      },
      {
        objection: 'Budget constraints',
        response: 'We offer flexible pricing and ROI calculators. Many customers see payback within 6-12 months.',
      },
    ];

    // Generate doNotMention (empty by default, can be customized)
    const doNotMention: Array<{ topic: string; reason: string }> = [];

    return {
      whyThisCompany: whyThisCompany.length > 0 ? whyThisCompany : ['AI-generated account messaging'],
      useCases: useCaseEntries,
      successStories: successStoryEntries,
      objectionHandlers,
      doNotMention,
    };
  } catch (error) {
    console.error('autoGenerateAccountMessaging error:', error);
    return null;
  }
}
