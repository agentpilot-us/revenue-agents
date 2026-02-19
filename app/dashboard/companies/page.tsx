import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { TargetAccountCard } from '@/app/components/dashboard/TargetAccountCard';
import { AccountFilters } from '@/app/components/dashboard/AccountFilters';

export default async function CompaniesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; industry?: string; coverage?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const params = await searchParams;
  const filters: { userId: string; industry?: string } = { userId: session.user.id };
  
  if (params.industry) {
    filters.industry = params.industry;
  }

  const companies = await prisma.company.findMany({
    where: filters,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { contacts: true, activities: true } },
      companyProducts: {
        where: { status: 'ACTIVE' },
        select: { arr: true },
      },
      segmentCampaigns: {
        select: { id: true },
      },
    },
  });

  // Calculate ARR and coverage status for each company
  const companiesWithData = companies.map((company) => {
    // Calculate ARR from active company products
    const arr = company.companyProducts.reduce(
      (sum, cp) => sum + Number(cp.arr ?? 0),
      0
    );

    // Determine coverage status
    const hasResearch = !!company.accountIntelligenceCompletedAt;
    const contactCount = company._count.contacts;
    const hasCampaigns = company.segmentCampaigns.length > 0;
    const hasEngagement = company._count.activities > 0;

    // Parse Salesforce opportunity data if available
    let salesforceOpportunityData = null;
    if (company.salesforceOpportunityData && typeof company.salesforceOpportunityData === 'object') {
      const oppData = company.salesforceOpportunityData as Record<string, unknown>;
      salesforceOpportunityData = {
        opportunityName: String(oppData.opportunityName ?? ''),
        stage: String(oppData.stage ?? ''),
        amount: Number(oppData.amount ?? 0),
        closeDate: oppData.closeDate ? String(oppData.closeDate) : null,
        daysUntilClose: oppData.daysUntilClose !== null && oppData.daysUntilClose !== undefined 
          ? Number(oppData.daysUntilClose) 
          : null,
        lastActivityDate: oppData.lastActivityDate ? String(oppData.lastActivityDate) : null,
      };
    }

    return {
      ...company,
      arr: arr > 0 ? arr : null,
      hasResearch,
      contactCount,
      hasCampaigns,
      hasEngagement,
      salesforceOpportunityData,
    };
  });

  // Apply coverage filter if specified
  let filteredCompanies = companiesWithData;
  if (params.coverage) {
    const coverageFilters = params.coverage.split(',');
    filteredCompanies = companiesWithData.filter((company) => {
      if (coverageFilters.includes('research') && !company.hasResearch) return false;
      if (coverageFilters.includes('contacts') && company.contactCount === 0) return false;
      if (coverageFilters.includes('pageLive') && !company.hasCampaigns) return false;
      if (coverageFilters.includes('engaged') && !company.hasEngagement) return false;
      return true;
    });
  }

  // Get unique industries for filter dropdown
  const industries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Target companies</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage accounts and run expansion, partner, or referral plays from a target company.
            </p>
          </div>
          <Link
            href="/dashboard/companies/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Add target company
          </Link>
        </div>

        <AccountFilters industries={industries} currentFilters={params} />

        {filteredCompanies.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {companies.length === 0
                ? 'No target companies yet. Add one to launch the expansion agent and send emails.'
                : 'No companies match the selected filters.'}
            </p>
            {companies.length === 0 && (
              <Link
                href="/dashboard/companies/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Add your first target company
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((company) => (
              <TargetAccountCard
                key={company.id}
                companyId={company.id}
                companyName={company.name}
                industry={company.industry}
                arr={company.arr}
                hasResearch={company.hasResearch}
                contactCount={company.contactCount}
                hasCampaigns={company.hasCampaigns}
                hasEngagement={company.hasEngagement}
                lastActivity={company.updatedAt}
                salesforceOpportunityData={company.salesforceOpportunityData}
                salesforceLastSyncedAt={company.salesforceLastSyncedAt}
                salesforceAccountId={company.salesforceId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
