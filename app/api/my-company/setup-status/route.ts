import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
  SETUP_THRESHOLDS,
  statusFromCounts,
  type StepStatus,
} from '@/lib/my-company/setup-thresholds';

export type SetupStep = {
  id: string;
  label: string;
  status: StepStatus;
  href: string;
  detail?: string;
  count?: number;
};

function profileStatus(u: {
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  primaryIndustrySellTo: string | null;
}): StepStatus {
  const fields = [
    u.companyName?.trim(),
    u.companyWebsite?.trim(),
    u.companyIndustry?.trim(),
    u.primaryIndustrySellTo?.trim(),
  ];
  const filled = fields.filter(Boolean).length;
  if (filled >= 4) return 'complete';
  if (filled >= 1) return 'partial';
  return 'empty';
}

/**
 * GET /api/my-company/setup-status
 * Aggregate counts for strategist onboarding progress (no new models).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const [
      user,
      catalogProductCount,
      contentLibraryCount,
      personaCount,
      messagingCount,
      industryPlaybookCount,
      activeTemplateCount,
      signalMappingCount,
      governance,
      companyCount,
      contactCount,
      companyProductCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          companyName: true,
          companyWebsite: true,
          companyIndustry: true,
          primaryIndustrySellTo: true,
        },
      }),
      prisma.catalogProduct.count({ where: { userId } }),
      prisma.contentLibrary.count({ where: { userId, isActive: true, archivedAt: null } }),
      prisma.persona.count({ where: { userId } }),
      prisma.messagingFramework.count({ where: { userId } }),
      prisma.industryPlaybook.count({ where: { userId } }),
      prisma.playTemplate.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.signalPlayMapping.count({ where: { userId } }),
      prisma.playGovernance.findUnique({ where: { userId }, select: { id: true } }),
      prisma.company.count({ where: { userId } }),
      prisma.contact.count({ where: { company: { userId } } }),
      prisma.companyProduct.count({ where: { company: { userId } } }),
    ]);

    const u = user ?? {
      companyName: null,
      companyWebsite: null,
      companyIndustry: null,
      primaryIndustrySellTo: null,
    };

    const steps: SetupStep[] = [
      {
        id: 'profile',
        label: 'Company profile',
        status: profileStatus(u),
        href: '/dashboard/my-company?tab=Profile',
        detail: 'Name, website, industry, sell-to',
      },
      {
        id: 'products',
        label: 'Product catalog',
        status: statusFromCounts(
          catalogProductCount,
          SETUP_THRESHOLDS.productsPartial,
          SETUP_THRESHOLDS.productsComplete,
        ),
        href: '/dashboard/my-company?tab=Products',
        count: catalogProductCount,
      },
      {
        id: 'content',
        label: 'Content Library',
        status: statusFromCounts(
          contentLibraryCount,
          SETUP_THRESHOLDS.contentPartial,
          SETUP_THRESHOLDS.contentComplete,
        ),
        href: '/dashboard/my-company?tab=Content%20Library',
        count: contentLibraryCount,
      },
      {
        id: 'personas',
        label: 'Buyer personas',
        status: statusFromCounts(
          personaCount,
          SETUP_THRESHOLDS.personasPartial,
          SETUP_THRESHOLDS.personasComplete,
        ),
        href: '/dashboard/my-company?tab=Personas',
        count: personaCount,
        detail: 'Who you sell to (separate from seller messaging)',
      },
      {
        id: 'messaging',
        label: 'Messaging frameworks',
        status:
          messagingCount >= SETUP_THRESHOLDS.messagingMin ? 'complete'
          : messagingCount > 0 ? 'partial'
          : 'empty',
        href: '/dashboard/my-company?tab=Messaging',
        count: messagingCount,
      },
      {
        id: 'playbooks',
        label: 'Industry playbooks',
        status:
          industryPlaybookCount >= SETUP_THRESHOLDS.playbooksMin ? 'complete'
          : 'empty',
        href: '/dashboard/my-company?tab=Playbooks',
        count: industryPlaybookCount,
      },
      {
        id: 'governance',
        label: 'Play governance',
        status: governance ? 'complete' : 'empty',
        href: '/dashboard/my-company?tab=Governance',
      },
      {
        id: 'templates',
        label: 'Play templates (ACTIVE)',
        status:
          activeTemplateCount >= SETUP_THRESHOLDS.activeTemplatesMin ? 'complete' : 'empty',
        href: '/dashboard/my-company?tab=Playbooks',
        count: activeTemplateCount,
        detail: 'Create or publish templates under Playbooks',
      },
      {
        id: 'signals',
        label: 'Signal → play rules',
        status:
          signalMappingCount >= SETUP_THRESHOLDS.signalMappingsMin ? 'complete'
          : 'empty',
        href: '/dashboard/roadmap',
        count: signalMappingCount,
        detail: 'Configure in Strategic Account Plan → Play Rules',
      },
      {
        id: 'accounts',
        label: 'Target accounts & data',
        status:
          companyCount >= 1 && contactCount >= 1 && companyProductCount >= 1 ? 'complete'
          : companyCount >= 1 && contactCount >= 1 ? 'partial'
          : companyCount >= 1 ? 'partial'
          : 'empty',
        href: '/dashboard/companies',
        detail: `${companyCount} accounts, ${contactCount} contacts, ${companyProductCount} company products`,
      },
    ];

    const completeCount = steps.filter((s) => s.status === 'complete').length;
    const partialCount = steps.filter((s) => s.status === 'partial').length;

    return NextResponse.json({
      steps,
      summary: {
        complete: completeCount,
        partial: partialCount,
        empty: steps.length - completeCount - partialCount,
        total: steps.length,
      },
    });
  } catch (e) {
    console.error('GET /api/my-company/setup-status:', e);
    return NextResponse.json({ error: 'Failed to load setup status' }, { status: 500 });
  }
}
