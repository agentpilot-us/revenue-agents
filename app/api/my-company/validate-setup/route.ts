import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type ValidateCheck = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail?: string;
  fixHref?: string;
};

/**
 * POST /api/my-company/validate-setup
 * Query-only checks aligned with strategist smoke tests (no LLM).
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const [
      activeTemplates,
      mappings,
      governance,
      contentCount,
      personaCount,
      companiesWithContactAndProduct,
      companyWithRenewalProduct,
    ] = await Promise.all([
      prisma.playTemplate.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.signalPlayMapping.count({ where: { userId } }),
      prisma.playGovernance.findUnique({ where: { userId }, select: { id: true } }),
      prisma.contentLibrary.count({ where: { userId, isActive: true, archivedAt: null } }),
      prisma.persona.count({ where: { userId } }),
      prisma.company.count({
        where: {
          userId,
          contacts: { some: {} },
          companyProducts: { some: {} },
        },
      }),
      prisma.companyProduct.findFirst({
        where: {
          company: { userId },
          OR: [{ contractRenewalDate: { not: null } }, { contractEnd: { not: null } }],
        },
        select: { id: true },
      }),
    ]);

    const checks: ValidateCheck[] = [
      {
        id: 'active_templates',
        label: 'At least one ACTIVE play template',
        status: activeTemplates > 0 ? 'pass' : 'fail',
        detail:
          activeTemplates > 0 ?
            `${activeTemplates} active template(s)`
          : 'Publish a template from My Company → Playbooks',
        fixHref: '/dashboard/my-company?tab=Playbooks',
      },
      {
        id: 'signal_mappings',
        label: 'Signal → play mappings configured',
        status: mappings > 0 ? 'pass' : 'warn',
        detail:
          mappings > 0 ?
            `${mappings} mapping(s)`
          : 'No mappings — signals will not start plays automatically',
        fixHref: '/dashboard/roadmap',
      },
      {
        id: 'governance',
        label: 'Play governance record exists',
        status: governance ? 'pass' : 'warn',
        detail: governance ? 'Governance saved' : 'Save defaults in Governance tab',
        fixHref: '/dashboard/my-company?tab=Governance',
      },
      {
        id: 'content_library',
        label: 'Content Library has items',
        status: contentCount > 0 ? 'pass' : 'warn',
        detail: contentCount > 0 ? `${contentCount} item(s)` : 'Add content for richer generation',
        fixHref: '/dashboard/my-company?tab=Content%20Library',
      },
      {
        id: 'buyer_personas',
        label: 'At least two buyer personas',
        status:
          personaCount >= 2 ? 'pass'
          : personaCount === 1 ? 'warn'
          : 'warn',
        detail:
          personaCount >= 2 ?
            `${personaCount} persona(s)`
          : personaCount === 1 ?
            'Add one more persona for stronger targeting'
          : 'Add buyer personas under My Company → Personas',
        fixHref: '/dashboard/my-company?tab=Personas',
      },
      {
        id: 'test_account',
        label: 'Test account with contact & company product',
        status: companiesWithContactAndProduct > 0 ? 'pass' : 'fail',
        detail:
          companiesWithContactAndProduct > 0 ?
            `${companiesWithContactAndProduct} account(s) ready for play tests`
          : 'Add a target account, contact, and at least one company product',
        fixHref: '/dashboard/companies',
      },
      {
        id: 'renewal_dates',
        label: 'CompanyProduct with renewal/end date (for renewal play tests)',
        status: companyWithRenewalProduct ? 'pass' : 'warn',
        detail:
          companyWithRenewalProduct ?
            'At least one product has contract dates'
          : 'Optional: set contractRenewalDate for timeline play validation',
        fixHref: '/dashboard/companies',
      },
    ];

    return NextResponse.json({ checks });
  } catch (e) {
    console.error('POST /api/my-company/validate-setup:', e);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
